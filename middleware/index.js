const Campground = require("../models/campground");
const Comment = require("../models/comment");

const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function(req, res, next){
    if(req.isAuthenticated()){
         Campground.findById(req.params.id, (err, foundCamp) => {
            if(err) {
                req.flash("error", "Campground not found!");
                res.redirect("back");
            }else {
                 //does user own the campground?
                 if(foundCamp.author.id.equals(req.user._id) || req.user.isAdmin) {
                      next();
                 }else {
                     req.flash("error", "You have no permisson to do that.");
                     res.redirect("back");
                 }
               
            }
         });
    }else {
        req.flash("error", "Please to login fist to do that.");
        res.redirect("back");
    }
};


middlewareObj.checkCommentOwnership = function(req, res, next) {
     if(req.isAuthenticated()){
         Comment.findById(req.params.comment_id, (err, foundComment) => {
            if(err) {
                res.redirect("back");
            }else {
                 //does user own the comment?
                 if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
                      next();
                 }else {
                     res.redirect("back");
                 }
               
            }
         });
    }else {
       res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Please Login First!");
    res.redirect("/login");
};

module.exports = middlewareObj;