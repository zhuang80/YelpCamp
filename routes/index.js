const express = require("express"),
      passport = require("passport"),
      router = express.Router(),
      async = require("async"),
      nodemailer = require("nodemailer"),
      crypto = require("crypto"),
      { google } = require("googleapis"),
      OAuth2 = google.auth.OAuth2,
      middleware = require("../middleware");;

const User = require("../models/user"),
      Campground = require("../models/campground"),
      Notification = require("../models/notification");
      
const oauth2Client = new OAuth2(
    process.env.CLIENTID,
    process.env.CLIENTSECRET,
    "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
    refresh_token: process.env.REFRESHTOKEN
});

const accessToken = oauth2Client.getAccessToken();
//root route
router.get("/", (req, res) => {
    res.render("landing");
});

//============
//AUTH ROUTES
//==============

//show register form 
router.get("/register", (req, res) => {
    res.render("register", {page: "register"});
})

//handle sign up logic 
router.post("/register", (req, res) => {
    const newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        avatar: req.body.avatar || "https://smk.org.uk/wp-content/uploads/avatar.jpg",
        email: req.body.email,
    });
    
    if(req.body.adminCode === "secretCode"){
        newUser.isAdmin = true;
    }
    
    User.register(newUser, req.body.password, (err, user) =>{
        if(err) {
            req.flash("error", err.message);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, ()=>{
                req.flash("success", "Welcome to YelpCamp.");
                res.redirect("/campgrounds");
            });
        }
    }); 
});


//show login form 
router.get("/login", (req, res) => {
    res.render("login", {page: "login"});
});

//handle login form
router.post("/login", passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "login"
}), (req, res) => {
    
});

//logout route
router.get("/logout", (req, res) => {
    req.logout();
    req.flash("success", "Logout successfully");
    res.redirect("/login");
})

//show a forgot-password form
router.get("/forgot", (req, res) => {
   res.render("users/forgot"); 
});

//handle forgot password logic 
router.post("/forgot", (req, res, next) => {
    async.waterfall([
        (done) => {
            crypto.randomBytes(20, (err, buf) => {
                const token = buf.toString('hex');
                done(err, token);
            });
        },
        (token, done) => {
            User.findOne({ email: req.body.email }, (err, user) => {
                if(err) {
                  console.error(err);
                  req.flash("error", "Something went wrong.");
                  res.redirect("/campgrounds");
                }
                if (!user) {
                    req.flash('error', 'No account with that email address exists.');
                    return res.redirect('/forgot');
                }
                
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 600000; // 10 minutes 
    
                user.save((err) => {
                    if(err) {
                        console.error(err);
                        res.redirect("/campgrounds");
                    }
                    done(err, token, user);
                });
            });
        },
        (token, user, done) => {
             const transporter = nodemailer.createTransport({
                 service: "gmail",
                 auth: {
                      type: "OAuth2",
                      user: process.env.GMAILACCOUNT, 
                      clientId: process.env.CLIENTID,
                      clientSecret: process.env.CLIENTSECRET,
                      refreshToken: process.env.REFRESHTOKEN,
                      accessToken: accessToken
                 },
                logger: true,
                debug: false // include SMTP traffic in the logs
            });
            const mailOptions = {
                from: process.env.GMAILACCOUNT,
                to: user.email,
                subject: "Node.js Password Reset",
                generateTextFromHTML: true,
                html: "<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>"+
                      "<p>Please click on the following link, or paste this into your browser to complete the process:</p>"+
                      `<a href='http://${req.headers.host}/reset/${token}'>Click this link to reset your password</a>`+
                      "<p>If you did not request this, please ignore this email and your password will remain unchanged.</p>"
             };
            transporter.sendMail(mailOptions, (err, info) => {
                if(err) console.log(err);
                else console.log("mail sent"); 
                console.log(info);
                done(err, "Check your email to reset your password");
            })
        }
  ], (err, info) => {
    if (err) return next(err);
    req.flash("success", info);
    res.redirect('/campgrounds');
  });
});


//show reset page 
router.get('/reset/:token', (req, res) =>{
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) =>{
        if(err) {
            console.error(err);
            req.flash("error", "Something went wrong.");
            res.redirect("campgrounds");
        }
        if(!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        res.render('users/reset', {token: req.params.token});
    });
});

//handle reset logic 
router.post('/reset/:token', (req, res) => {
    async.waterfall([
        (done)=> {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, (err, user) => {
                if(err) {
                    console.error(err);
                    req.flash("error","Something went wrong.");
                }
                if (!user) {
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }
                
                if(req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, (err) => {
                        if(err) {
                            console.error(err);
                            req.flash("error", "Something went wrong.");
                            res.redirect("campgrounds");
                        }
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;
    
                        user.save((err) => {
                            if(err) {
                                console.error(err);
                                req.flash("Something went wrong.");
                                res.redirect("campgrounds");
                            }
                            req.logIn(user, (err) => {
                                done(err, user);
                            });
                        });
                    })
                } else {
                    req.flash("error", "Passwords do not match.");
                    return res.redirect('back');
                }
            });
        },
        (user, done) => {
            const transporter = nodemailer.createTransport({
                 service: "gmail",
                 auth: {
                      type: "OAuth2",
                      user: process.env.GMAILACCOUNT, 
                      clientId: process.env.CLIENTID,
                      clientSecret: process.env.CLIENTSECRET,
                      refreshToken: process.env.REFRESHTOKEN,
                      accessToken: accessToken
                 },
                logger: true,
                debug: false // include SMTP traffic in the logs
            });
            const mailOptions = {
                    from: process.env.GMAILACCOUNT,
                    to: user.email,
                    subject: "Your password has been changed",
                    generateTextFromHTML: true,
                    html: "<p>Hello,</p><br>"+
                    `<p>This is a confirmation that the password for your account ${user.email} has just been changed.`
                 };
                transporter.sendMail(mailOptions, (err, info) => {
                    if(err) console.log(err);
                    console.log(info);
                    done(err, "Success! Your password has been changed.");
                })
        }
  ], function(err, info) {
      if(err) {
          console.error(err);
          req.flash("error", "Something went wrong.");
          req.redirect("campgrounds");
      }
      req.flash("success", info);
      res.redirect('/campgrounds');
  });
});


//user profile route
//show indicate which component is present 
router.get("/users/:id/profile/:show", async (req, res) => {
    try{
       const user = await User.findById(req.params.id).populate('notifications', null, {isRead: false}).exec();;
       const campgrounds = await Campground.find().where("author.id").equals(user._id).exec();

       if(req.params.show === "campground"){
            if(req.user) {
             res.render("users/show", {user, campgrounds, isFollowing: user.isFollowing(req.user._id), show: req.params.show});
           }else {
                res.render("users/show", {user, campgrounds, isFollowing: false, show: req.params.show});
           }
       }
       if(req.params.show === "notification"){
           if(req.user._id.equals(req.params.id)) {
               res.render("users/show",  {user, notifications: user.notifications, isFollowing: false, show: req.params.show});
           }
       }
      
    }catch(err) {
        req.flash("error", err.message);
        res.redirect('back');
    }
});

// view all notifications
router.get("/notifications", middleware.isLoggedIn, async (req, res) => {
    res.redirect(`/users/${req.user._id}/profile/notification`);
});


//===================
//Handle AJAX request from client side 
//Send back JSON format Data
//======================

//send back posts of the user
router.get("/users/:id/posts", async (req, res) => {
    try{
        const ret = [];
        // eval(require("locus"));
        const campgrounds = await Campground.find().where("author.id").equals(req.params.id).exec();
        
        for(const campground of campgrounds){
            ret.push(campground.toCampgroundJSON());
        }
       
        res.json({
            campgrounds: ret
        });
    }catch(err) {
        console.error(err);
        res.redirect("back");
    }
});

//send back notifications of the user 
router.get("/users/:id/notifications", middleware.isLoggedIn, async (req, res) => {
   try{
       const ret = [];
       const notifications = await Notification.find();
       for(const notification of notifications){
           ret.push(notification.toNotificationJSON());
       }
       res.json({
           notifications: notifications
       });
   }catch(err) {
       console.error(err);
       res.redirect("back");
   }
});

//follow user 
router.post("/follow/:id", middleware.isLoggedIn, async (req, res) => {
    try{
        const user = await User.findById(req.params.id);
         const campgrounds = await Campground.find().where("author.id").equals(user._id).exec();
        if(user.isFollowing(req.user._id)){
            user.unfollow(req.user._id);
            req.flash("success", `Successfully unfollowed ${user.username}!`);
            res.redirect(`/users/${req.params.id}/profile/campground`);
            
        }
        else {
            user.follow(req.user._id);
            req.flash("success", `Successfully followed ${user.username}!`);
            res.redirect(`/users/${req.params.id}/profile/campground`);
        }
    } catch(err) {
        req.flash("error", err.message);
        res.redirect('back');
    }
});





//handle notification 
router.get("/notifications/:id", middleware.isLoggedIn, async (req,res) => {
    try{
        const notification = await Notification.findById(req.params.id);
        notification.isRead = true;
        notification.save();
        res.redirect(`/campgrounds/${notification.campgroundId}`);
    } catch(err) {
        req.flash("error", err.message);
        res.redirect('back');
    }
});


module.exports = router;