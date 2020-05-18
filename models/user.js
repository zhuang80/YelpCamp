const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: {type: String, unique: true, required: true},
    password: String,
    avatar: {type: String, default: "https://smk.org.uk/wp-content/uploads/avatar.jpg" },
    firstName: String,
    lastName: String,
    email: {type: String, unique: true, required: true},
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isAdmin: {type: Boolean, default: false},
    isPaid: {type: Boolean, default: false},
    notifications: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification'
        }
    ],
    followers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }    
    ]
});

userSchema.plugin(passportLocalMongoose);


userSchema.methods.follow = function(id){
  if(this.followers.indexOf(id) === -1){
    this.followers = this.followers.concat(id);
  }
  return this.save();
};

userSchema.methods.unfollow = function(id){
  const idx = this.followers.indexOf(id);
  console.log(idx);
  this.followers.splice(idx, 1);
  return this.save();
};


userSchema.methods.isFollowing = function(id){
  return this.followers.some(function(followId){
    return followId.toString() === id.toString();
  });
};



module.exports = mongoose.model("User", userSchema);