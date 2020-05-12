const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware");
const NodeGeocoder = require('node-geocoder');
const multer = require("multer");

const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter})

const cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dcrw32w2w', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
const geocoder = NodeGeocoder(options);

//INDEX ROUTE
router.get("/", (req, res) => {
    if(req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        if(req.query.searchType === "name") {
            Campground.find({name: req.query.search }, (err, campgrounds) => {
              if(err) {
                  req.flash("error", err.message);
              }else{
                  res.render("campgrounds/index", {campgrounds: campgrounds, currentUser: req.user, page: "campgrounds"});
              }
           });
        }else if(req.query.searchType === "author"){
             Campground.find({"author.username": req.query.search}, (err, campgrounds) => {
              if(err) {
                  req.flash("error", err.message);
              }else{
                  res.render("campgrounds/index", {campgrounds: campgrounds, currentUser: req.user, page: "campgrounds"});
              }
           });
        }
      
    }else {
    // Get campgrounds 
         Campground.find({}, (err, campgrounds) => {
          if(err) {
              req.flash("error", err.message);
          }else{
              res.render("campgrounds/index", {campgrounds: campgrounds, currentUser: req.user, page: "campgrounds"});
          }
       });
    }
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
  // get data from form and add to campgrounds array
  const name = req.body.name;
  const image = req.body.image;
  const desc = req.body.description;
  const author = {
      id: req.user._id,
      username: req.user.username
  }
  geocoder.geocode(req.body.location, (err, data) => {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    const lat = data[0].latitude;
    const lng = data[0].longitude;
    const location = data[0].formattedAddress;
    const newCampground = {name, image, description: desc, author, location, lat, lng};
    // Create a new campground and save to DB
    cloudinary.uploader.upload(req.file.path, (result) => {
        //add cloudinary url for the image to the campground object under image property 
        newCampground.image = result.secure_url;
        Campground.create(newCampground, (err, newlyCreated) =>{
            if(err){
                console.log(err);
            } else {
                //redirect back to campgrounds page
                res.redirect("/campgrounds");
            }
        });
    });
    
  });
});

//new route 
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("campgrounds/new");
});


// SHOW - shows more info about one campground 
router.get("/:id", (req, res) => {
    //find the campground with provided ID
    
    Campground.findById(req.params.id).populate("comments").exec((err, foundCamp) => {
        if(err) {
            console.log("ERROR");
            console.log(err);
        }else {
            console.log(foundCamp);
            res.render("campgrounds/show", {campground: foundCamp});
        }
    })
});

//edit campground route 
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
    //if user logged in 
    Campground.findById(req.params.id, (err, foundCamp) => {
        if(err) {
            console.log(err);
        }else {
             res.render("campgrounds/edit", {campground: foundCamp});
        }
    });
});


// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, (req, res) =>{
  geocoder.geocode(req.body.campground.location, (err, data) => {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.campground.lat = data[0].latitude;
    req.body.campground.lng = data[0].longitude;
    req.body.campground.location = data[0].formattedAddress;

    Campground.findByIdAndUpdate(req.params.id, req.body.campground, (err, campground) =>{
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/campgrounds/" + campground._id);
        }
    });
  });
});

//destroy campground route
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findByIdAndRemove(req.params.id, (err) => {
        if(err) {
            res.redirect("/campgrounds");
        }else {
            res.redirect("/campgrounds");
        }
    })    
});


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;