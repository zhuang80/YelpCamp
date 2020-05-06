const express = require("express");
const app = express();

const imageUrl = "https://images.unsplash.com/photo-1537565266759-34bbc16be345?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1050&q=80";
app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("landing");
});

app.get("/campgrounds", (req, res) => {
   const campgrounds = [
        {name: "Salmon", image: imageUrl},
        {name: "Salmon", image: imageUrl},
        {name: "Salmon", image: imageUrl}
   ]; 
   
   res.render("campgrounds", {campgrounds: campgrounds});
});
app.listen(process.env.PORT, () => {
    console.log(`The server is running on port ${process.env.PORT}.`);
});