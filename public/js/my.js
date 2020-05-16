$(document).ready(function(){
    $("#my-post").on("click", function() {
        $(this).parent().siblings().children().removeClass("active");
        $(this).addClass("active");
      let currentLocation = new String(window.location);
        let start = currentLocation.lastIndexOf('/', currentLocation.lastIndexOf('/') - 1) - 1;
        let idx = currentLocation.lastIndexOf('/', start);
        let id = currentLocation.substring(idx + 1, start+1);
        
        console.log(id);
       
        
        $.ajax({
            url:"/users/" + id + "/posts"
        })
        .done(function(data) {
            console.log(data);
           let content = "<ul class='list-group list-group-flush'>";
           for(const item of data.campgrounds) {
               content += `<li class="list-group-item"><a href="/campgrounds/${item.id}">${item.name}</a></li>`;
           }
           content += "</ul>";
           $("#content-part").html(content);
        })
       
    });
    
    $("#notification").on("click", function(){
       $(this).parent().siblings().children().removeClass("active");
       $(this).addClass("active");
       let currentLocation = new String(window.location);
        let start = currentLocation.lastIndexOf('/', currentLocation.lastIndexOf('/') - 1) - 1;
        let idx = currentLocation.lastIndexOf('/', start);
        let id = currentLocation.substring(idx + 1, start+1);
        
        console.log(id);
       $.ajax({
           url:"/users/" + id + "/notifications"
       })
       .done(function(data) {
          let content = "<ul class='list-group list-group-flush'>";
          for(const item of data.notifications){
              content += `<li class="list-group-item d-flex justify-content-between align-items-center"><a href="/notifications/${item._id}">${item.username} created a new post</a>`;
              if(!item.isRead){
                  content +=`<span class="badge badge-pill badge-info d-line ml-5">new</span>`;
              }
          }
         content += "</li></ul>";
          $("#content-part").html(content);
       });
       
    });
});

