const express = require("express"),
      passport = require("passport"),
      router = express.Router(),
      async = require("async"),
      nodemailer = require("nodemailer"),
      crypto = require("crypto");

const User = require("../models/user"),
      Campground = require("../models/campground");

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
        avatar: req.body.avatar,
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

//show forgot-password form
router.get("/forgot", (req, res) => {
   res.render("users/forgot"); 
});

//handle forgot password 
router.post("/forgot", (req, res, next) => {
     new Promise((resolve, reject) =>{
                const testAccount = nodemailer.createTestAccount();
                resolve(testAccount);
            }).then((testAccount)=>{
                   const smtpTransport = nodemailer.createTransport({
                   host: "smtp.ethereal.email",
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: {
                      user: testAccount.user, // generated ethereal user
                      pass: testAccount.pass // generated ethereal password
                    }
                 });
                 
                  const mailOptions = {
                from: testAccount.user,
                to: "zhaochaohuang8@gmail.com",
                subject: "Node.js Password Reset",
                text: "Hallo"
             };
            smtpTransport.sendMail(mailOptions, (err) => {
                if(err) console.log(err);
                else console.log("mail sent"); 
            })
            }).catch((err) => {
                console.log(err);
            }).finally(()=> {
                res.send("done");
            });
    // async.waterfall([
    //     (done)=> {
    //         new Promise((resolve, reject) =>{
    //             const testAccount = nodemailer.createTestAccount();
    //             resolve(testAccount);
    //         }).then((testAccount)=>{
    //              const smtpTransport = nodemailer.createTransport({
    //           host: "smtp.ethereal.email",
    //             port: 587,
    //             secure: false, // true for 465, false for other ports
    //             auth: {
    //               user: testAccount.user, // generated ethereal user
    //               pass: testAccount.pass // generated ethereal password
    //             }
    //         });  
    //         }).catch((err) => {
    //             console.log(err);
    //         });
    //     },
        // (testAccount, done) =>{
        //      const smtpTransport = nodemailer.createTransport({
        //       host: "smtp.ethereal.email",
        //         port: 587,
        //         secure: false, // true for 465, false for other ports
        //         auth: {
        //           user: testAccount.user, // generated ethereal user
        //           pass: testAccount.pass // generated ethereal password
        //         }
        //     });  
        //     done(null, smtpTransport, testAccount);
        // },
        // (smtpTransport, testAccount, done) => {
        //   const mailOptions = {
        //         from: testAccount.user,
        //         to: "ligoh50305@beiop.com",
        //         subject: "Node.js Password Reset",
        //         text: "Hallo"
        //      };
        //     smtpTransport.sendMail(mailOptions, (err) => {
        //         if(err) console.log(err);
        //         else console.log("mail sent"); 
        //     })
        //     done(null, "done");
        // }
        // ], (err, results) => {
        //      if(err) return next(err);
        //      res.send("done");
        //      res.redirect("/forgot");
        // });
    
    // async.waterfall([
        // (done) => {
        //   crypto.randomBytes(20, (err, buf) => {
        //      const token = buf.toString("hex");
        //      done(err, token);
        //   });  
        // },  
        // (token, done) => {
        //     User.findOne({email: req.body.email}, (err, user) => {
        //         if(!user) {
        //             req.flash("error", "No account with that email address exists.");
        //             return res.redirect("/forgot");
        //         }
        //         user.resetPasswordToken = token;
        //         user.resetPasswordExpires = Date.now() + 600000;
        //         user.save((err) =>{
        //           done(err, token, user); 
        //         });
        //     });
        // },
    //     (token, user, done) =>{
    //         const smtpTransport = nodemailer.createTransport({
    //             service: "Gmail",
    //             auth: {
    //                 user: process.env.GMAILACCOUNT,
    //                 pass: process.env.GMAILPW
    //             }
    //         });  
    //         const mailOptions = {
    //             to: user.email,
    //             from: process.env.GMAILACCOUNT,
    //             subject: "Node.js Password Reset",
    //             text: `You are receiving this because you (or someone else) have requested the reset of the password\n
    //                 Please click on the following link or paste this into your browser to complete the process\n
    //                 http://${req.headers.host}/reset/${token}\n\n
    //                 if you did not request this, please ignore this email and your password will remain unchanged.`,
    //         };
    //         smtpTransport.sendMail(mailOptions, (err) => {
    //             console.log("mail sent");
    //             req.flash("success", "An e-mail has been sent to "+ user.email + " with further instructions.");
    //             done(err, "done");
    //         })
    //     }
    // ], (err) => {
    //   if(err) return next(err);
    //   res.redirect("/forgot");
    // }); 
});
//user profile route 
router.get("/users/:id", (req, res) => {
   User.findById(req.params.id, (err, foundUser) => {
    if(err) {
        req.flash("error", "Can't find the User");
        res.redirect("back");
    }
    Campground.find().where("author.id").equals(foundUser._id).exec((err, campgrounds) => {
       if(err) {
           req.flash("error", "Something went wrong");
           res.redirect("back");
       } 
        res.render("users/show", {user: foundUser, campgrounds});
    });
   
   }); 
});
module.exports = router;