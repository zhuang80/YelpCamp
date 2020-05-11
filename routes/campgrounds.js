const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware");
var NodeGeocoder = require('node-geocoder');
 
var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};
 
var geocoder = NodeGeocoder(options);

//INDEX ROUTE
router.get("/", (req, res) => {
    
   Campground.find({}, (err, campgrounds) => {
      if(err) {
          req.flash("error", err.message);
      }else{
          res.render("campgrounds/index", {campgrounds: campgrounds, currentUser: req.user, page: "campgrounds"});
      }
   });
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, (req, res) => {
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
    Campground.create(newCampground, (err, newlyCreated) =>{
        if(err){
            console.log(err);
        } else {
            //redirect back to campgrounds page
            console.log(newlyCreated);
            res.redirect("/campgrounds");
        }
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

module.exports = router;