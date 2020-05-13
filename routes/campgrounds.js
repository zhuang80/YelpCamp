const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const User = require("../models/user");
const Notification = require("../models/notification");
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
  const price = req.body.price;
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
    const newCampground = {name, image, price, description: desc, author, location, lat, lng};
    // Create a new campground and save to DB
    cloudinary.v2.uploader.upload(req.file.path, (err, result) => {
        //add cloudinary url for the image to the campground object under image property 
        if(err) {
            req.flash("error", err.message);
            return res.redirect('back');
        }
        newCampground.image = result.secure_url;
        newCampground.imageId = result.public_id;
        
        Campground.create(newCampground, (err, newlyCreated) =>{
            if(err){
                console.log(err);
            } else {
                //redirect back to campgrounds page
                User.findById(req.user._id).populate('follower').exec((err, foundUser) => {
                    if(err) console.error(err);
                    const newNotification = {
                        username: req.user.username,
                        campgroundId: newlyCreated._id
                    }
                   
                    Notification.create(newNotification, (err, newlyCreatedNotification) => {
                         if(err) console.error(err);
                         for(const follower of foundUser.followers) {
                              follower.notifications.push(newlyCreatedNotification);
                              follower.save();
                         }
                    })
                
                });
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
router.get("/:id", async (req, res) => {
    //find the campground with provided ID
    try {
        const campground =await Campground.findById(req.params.id).populate("comments").exec();
        res.render("campgrounds/show", {campground});
    }catch(err) {
        req.flash("error", err.message);
        res.redirect("/campgrounds");
    }
});

//show edit campground form route 
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, campground) => {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }else {
             res.render("campgrounds/edit", {campground});
        }
    });
});


// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, upload.single("image"), (req, res) =>{
  geocoder.geocode(req.body.location, (err, data) => {
    if (err || !data.length) {
      req.flash('error', 'Invalid address');
      return res.redirect('back');
    }
    req.body.lat = data[0].latitude;
    req.body.lng = data[0].longitude;
    req.body.location = data[0].formattedAddress;
    
    Campground.findById(req.params.id, async (err, campground) => {
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        }else {
            if(req.file) {
                try {
                    //first delete the old image from cloudinary 
                    await cloudinary.v2.uploader.destroy(campground.imageId);
                    //then upload the new image
                    const result = await cloudinary.v2.uploader.upload(req.file.path);
                    campground.imageId = result.public_id;
                    campground.image = result.secure_url;
                } catch(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            campground.name = req.body.name;
            campground.description = req.body.description;
            campground.price = req.body.price;
            campground.save();
            req.flash("success", "Successfully updated!");
            res.redirect(`/campgrounds/${campground._id}`);
        }
    });
  });
});

//destroy campground route
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, async (err, campground) => {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            //delete the image from cloudinary
            await cloudinary.v2.uploader.destroy(campground.imageId);
            //delete the campground from mongodb
            campground.remove();
            req.flash("success", "Successfully deleted campground!");
            res.redirect("/campgrounds");
        } catch(err) {
            if(err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
        }
    });
});


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;