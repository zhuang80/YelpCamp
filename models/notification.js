const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    username: String,
    campgroundId: String,
    isRead: {
        type: Boolean,
        default: false
    }
});


notificationSchema.methods.toNotificationJSON = function(){
  return {
      username: this.username,
      campgroundId: this.campgroundId,
      isRead: this.isRead
  };  
};

module.exports = mongoose.model("Notification", notificationSchema);