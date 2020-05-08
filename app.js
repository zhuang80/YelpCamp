const express = require("express"),
      bodyParser = require("body-parser"),
      mongoose = require("mongoose"),
      Campground = require("./models/campground.js"),
      seedDB = require("./seeds.js"),
      app = express();
      
const imageUrl = "https://images.unsplash.com/photo-1537565266759-34bbc16be345?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80";

mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true);


mongoose.connect("mongodb://localhost:27017/yelp_camp");

seedDB();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", (req, res) => {
    res.render("landing");
});

app.get("/campgrounds", (req, res) => {
   Campground.find({}, (err, campgrounds) => {
      if(err) {
          console.log("ERROR");
          console.log(err);
      }else{
          res.render("campgrounds/index", {campgrounds: campgrounds})
      }
   });
});

app.post("/campgrounds", (req, res) => {
    const name = req.body.name;
    const image = req.body.image;
    const description = req.body.description;
    const newCampground = {name: name, image: image, description: description};
    Campground.create(newCampground, (err, newCamp) => {
        if(err) {
            console.log(err);
        }else{
            res.redirect("/campgrounds");
        }
    })
});

app.get("/campgrounds/new", (req, res) => {
    res.render("campgrounds/new");
});


// SHOW - shows more info about one campground 
app.get("/campgrounds/:id", (req, res) => {
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

//==============
// COMMENTS ROUTES
//==============

app.get("/campgrounds/:id/comments/new", (req, res) => {
    Campground.findById(req.params.id, (err, campground) => {
        if(err) {
            console.log(err);
        }else {
            res.render("comments/new", {campground: campground});
        }
    })
});
app.listen(process.env.PORT, () => {
    console.log(`The server is running on port ${process.env.PORT}.`);
});