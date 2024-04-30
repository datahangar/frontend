//Iframe
function main_iframe_set_url(url){
   $("#main-iframe").attr("src", url);
}
function main_iframe_get_url(){
   return $("#main-iframe").contents().get(0).location.hash;
}

function main_iframe_has_turnilo(){
  return $("#main-iframe").contents().get(0).location.path == "turnilo";
}

function get_datacube_from_url(url){
  return url.match("#([^\/]*)\/.*")[1];
}

//Nav
$( "#main-navbar li.nav-item a.nav-link" ).on("click", function(){
     if($(this).hasClass("disabled") || $(this).hasClass("dropdown-toggle")) return;
     $("#main-navbar li.nav-item a.active").removeClass("active");
     //$("#main-navbar li.nav-item a.active2").removeClass("active2");
     curr = $(this).attr("id");
     switch(curr) {
       case 'home':
       case 'help':
       case 'alarms':
       case 'reports':
         $("#main-iframe").attr("src", $(this).attr("id")+".html");
         break;
       case 'datacubes':
         $("#create-dashboard").removeClass("disabled");
         main_iframe_set_url("turnilo/");
         break;
       case 'create-dashboard':
         url = main_iframe_get_url();
         if(url == ""){
           $("#datacubes").addClass("active"); //revert
           return;
         }
         $("#create-dashboard-url").val(url);
         $("#create-dashboard-modal").modal("show");
         return;
       default:
         break;
     }
     if($(this).hasClass("active"))
       $(this).removeClass("active");
     else
       $(this).addClass("active");
});

//Dashboards
function dashboards_add_link(short_name, name, preset){
    dashboards_menu_divider = $("#nav-dashboards h6.dropdown-header");
    if(!preset)
      $('<a class="dropdown-item dashboard" href="#" id="'+short_name+'">'+name+'</a>').insertBefore(dashboards_menu_divider);
    else
      $('<a class="dropdown-item dashboard" href="#" id="'+short_name+'">'+name+'</a>').insertAfter(dashboards_menu_divider);
}

function dashboards_load_dashboard(hash, shortName, name){
  main_iframe_set_url("turnilo/"+hash);
  $("#main-navbar li.nav-item a.active").removeClass("active");
  $("#dashboards").addClass("active");

  //Store for watcher (last clicked dashboard)
  curr = {
    "hash" : hash,
    "shortName": shortName,
    "name": name
  };
  $("body").data("curr_dashboard", curr);
}

function dashboards_reprogram_handlers(){
    $("#main-navbar li.nav-item a.dashboard" ).on("click", function(){
      dashboard_link = $(this)
      //Check if it's a custom Dashboard
      dashboards_dict=$("#nav-dashboards").data("dashboards");
      dashboard = dashboards_dict[$(this).attr("id")]
      shortName = dashboard["shortName"];
      name = dashboard["name"]
      if("hash" in dashboard){
        dashboards_load_dashboard(dashboard["hash"], shortName, name);
      }else{
       //Preset (View Definition)
        $.getJSON("dashboard_defs/"+dashboard["shortName"]+".json", function( data ) {
         $.post( "turnilo/mkurl", data, function(data) {
           dashboards_load_dashboard(data["hash"], shortName, name);
         });
        });
      }
    });

    $("#manage-dashboards" ).on("click", function(){
      main_iframe_set_url("dashboards.html");
    });
}

function dashboards_program_create_handler(){
  $("#create-dashboard-submit").on("click", function(){
     //Validate
     name = $("#create-dashboard-name").val();
     description = $("#create-dashboard-description").val();
     url_val = $("#create-dashboard-url").val();
     if(!name || name == "" || !url_val || url_val == ""){
        notify_error("Unable to create dashboard. Invalid name or URL!");
        return;
     }

     //Create a dashboard
     shortName = rand_str();
     dashboard = {
        "dataCube":  get_datacube_from_url(url_val),
        "shortName": shortName,
        "name":      name,
        "hash":      url_val
     }
     //Add to the backend
     $.ajax({
       url: '/rest/turnilo/dashboards/',
       type: 'POST',
       headers: {'Content-Type': 'application/json'},
       data: JSON.stringify(dashboard),
       success: function(dashboard, status) {
         console.log("Dashboard successfully created in the backend...");
         console.log(JSON.stringify((dashboard)));
         shortName = dashboard["shortName"];
         dashboards_dict=$("#nav-dashboards").data("dashboards");
         dashboards_dict[shortName] = dashboard;
         dashboards_add_link(shortName, name, false);
         dashboards_reprogram_handlers();
         $("#create-dashboard-modal").modal("hide");
         dashboards_load_dashboard(url_val, shortName, name);
         notify_success("Created dashboard '"+name+"'");
       }
    });
  });
}

function dashboards_program_watcher(){
  setInterval(function(){
    //DataCube
    curr_hash = main_iframe_get_url();
    if(curr_hash && curr_hash != ""){
      $.getJSON( "turnilo/sources/", function( custom_data ) {
        datacube_name = get_datacube_from_url(curr_hash);
        name = datacube_name;
        $.each(custom_data["dataCubes"], function(idx, elem) {
           if(elem["name"] == name){
             name = elem["title"];
             return false;
           }
        });
        $("#datacube-label").text("("+name+")");
      });
    }else{
        $("#datacube-label").text("");
    }

    //Dashboard
    if($("body").data("curr_dashboard") == null) return;
    last_hash = $("body").data("curr_dashboard")["hash"];
    if(last_hash == curr_hash){
      $("#dashboards-label").text("Dashboards("+$("body").data("curr_dashboard")["name"]+")");
    }else{
      $("#dashboards-label").text("Dashboards");
     $("#dashboards").removeClass("active");
     $("#datacubes").addClass("active");
    }
  }, 500);
}

$( document ).ready(function() {
  //Get list of preset dashboards
  $.getJSON( "dashboard_defs/index.json", function( data ) {
    dashboards = data["dashboards"];
    $.each(dashboards, function( key, val ) {
	dashboards_add_link(key, val["name"], true);
    });

    $("#nav-dashboards").data("dashboards", dashboards);
    dashboards_reprogram_handlers();
    feather.replace();

    //Get the list of custom dashboards
    $.getJSON( "rest/turnilo/dashboards/", function( custom_data ) {
      $.each(custom_data, function(idx, elem) {
        console.log("Adding custom dashboard '"+elem["name"]+"':\n"+JSON.stringify(elem));
        dashboards[elem["shortName"]] = elem;
        dashboards_add_link(elem["shortName"], elem["name"], false);
      });
      $("#nav-dashboards").data("dashboards", dashboards);
      dashboards_reprogram_handlers();
      feather.replace();
    });

  dashboards_program_create_handler();
  dashboards_program_watcher();
  });
  notify_info("Welcome!");
});
