const mongoose = require("mongoose");

const campgroundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: "Campground name cannot be blank."
    },
    price: String,
    image: String,
    imageId: String,
    description: String,
    location: String,
    lat: Number,
    lng: Number,
    createdAt: {type: Date, default: Date.now},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }]
});

campgroundSchema.methods.toCampgroundJSON = function() {
    return {
        name: this.name,
        id: this._id
    };
}

module.exports = mongoose.model("Campground", campgroundSchema);