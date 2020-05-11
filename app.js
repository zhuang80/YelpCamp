require('dotenv').config();

const express = require("express"),
      bodyParser = require("body-parser"),
      mongoose = require("mongoose"),
      Campground = require("./models/campground.js"),
      Comment = require("./models/comment.js"),
      User = require("./models/user.js"),
      seedDB = require("./seeds.js"),
      passport = require("passport"),
      LocalStrategy = require("passport-local"),
      methodOverride = require("method-override"),
      flash = require("connect-flash"),
      app = express();
      
//MONGOOSE CONFIGURATION      
mongoose.set("useNewUrlParser", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect("mongodb://localhost:27017/yelp_camp");


//require moment JS and add it to app.locals 
app.locals.moment = require("moment");

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//seedDB();

//add middlewares 
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.use(flash());
app.use(function(req, res, next) {
    //req.locals is accessable in all ejs templates
    //req.user is null if no user is logined otherwise hold the current user
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
})

//require routers 
const commentRoutes = require("./routes/comments"),
      campgroundRoutes = require("./routes/campgrounds"),
      indexRoutes = require("./routes/index");
      
app.use(indexRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);
app.use("/campgrounds",campgroundRoutes);


app.listen(process.env.PORT, () => {
    console.log(`The server is running on port ${process.env.PORT}.`);
});