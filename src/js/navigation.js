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
  try{
    return url.match("#([^\/]*)\/.*")[1];
  }catch(error){
    return null;
  }
}

//Dashboard REST API recovery
datacubes = {};
dashboards = {};
dashboard_urls = {};
curr_datacube = null;

function rest_query_datacubes(){
  $.getJSON( "turnilo/sources/", function(custom_data){
    datacubes_ = {}
    $.each(custom_data["dataCubes"], function(idx, elem) {
      datacubes_[elem["name"]] = elem;
    });
    datacubes = datacubes_;
  });
}

function rest_query_dashboards(){
  $.getJSON( "rest/turnilo/dashboards/", function(custom_data){
    dashboards_ = {};
    $.each(custom_data, function(idx, elem) {
      dashboards_[elem["shortName"]] = elem;
    });
    dashboards = dashboards_;
  });
}

//Navigation
$("#main-navbar li.nav-item a.nav-link").on("click", function(){
    if($(this).hasClass("disabled") || $(this).hasClass("dropdown-toggle"))
      return;

    $("#main-navbar li.nav-item a.active").removeClass("active");

    switch($(this).attr("id")) {
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
        $("#modal-dashboard-url").val(url);
        $("#modal-dashboard-id").val("");
        $("#modal-dashboard-name").val("");
        $("#modal-dashboard-description").val("");
        $("#modal-dashboard-create").show();
        $("#modal-dashboard-close").show();
        $("#modal-dashboard-update").hide();
        $("#modal-dashboard-delete").hide();
        $("#modal-dashboard").modal("show");
        return;
      default:
        $("#main-iframe").attr("src", $(this).attr("id")+".html");
        break;
    }

    $(this).toggleClass("active")
});

//Create or update dashboard
function create_update_dashboard(create){
    //Validate
    id = $("#modal-dashboard-id").val();
    name = $("#modal-dashboard-name").val();
    description = $("#modal-dashboard-description").val();
    url_val = $("#modal-dashboard-url").val();

    if(!name || name == "" || !url_val || url_val == ""){
      notify_error("Unable to create dashboard. Invalid name or URL!");
      return;
    }

    //Create a dashboard
    dataCube = get_datacube_from_url(url_val);
    dashboard = {
      "dataCube":    dataCube,
      "shortName":   name,
      "description": description,
      "name":        name,
      "hash":        url_val
    }

    url = '/rest/turnilo/dashboards/';
    if(create){
      type = 'POST';
      op_str = "Create";
    }else{
      dashboard['id'] = id;
      url += id;
      type = 'PUT';
      op_str = "Update";
    }

    //Add to the backend
    $.ajax({
      url: url,
      type: type,
      crossDomain: true,
      headers: {'Content-Type': 'application/json'},
      data: JSON.stringify(dashboard),
      success: function(dashboard, status) {
        console.log("Dashboard successfully "+op_str.toLowerCase()+"d in the backend...");
        console.log(JSON.stringify((dashboard)));
        $("#modal-dashboard-id").val(dashboard['id']);
        $("#modal-dashboard").modal("hide");
        notify_success(op_str+"d dashboard '"+name+"'");

        timer_query_rest(true);
        timer_update_views(true);
      },
      error: function(xhr, status, error) {
        notify_error("Failed: "+op_str+" dashboard '"+name+"'");
      }
    });
}
$("#modal-dashboard-create").on("click", function(){
  create_update_dashboard(true);
});
$("#modal-dashboard-update").on("click", function(){
  create_update_dashboard(false);
});
$("#modal-dashboard-delete").on("click", function(){
    id = $("#modal-dashboard-id").val();
    name = $("#modal-dashboard-name").val();
    url = '/rest/turnilo/dashboards/'+id;

    //Be kind
    $("#modal-confirm-dashboard-name").html(name);
    $("#modal-confirm button.confirm_delete").attr('data-url', url);
    $("#modal-confirm button.confirm_delete").attr('data-name', name);
    $("#modal-confirm").modal("show");
});
$("#modal-confirm button.confirm_delete").on("click", function(){
  url = $(this).attr('data-url');
  name = $(this).attr('data-name');
  $.ajax({
    url: url,
    type: 'DELETE',
    crossDomain: true,
    headers: {'Content-Type': 'application/json'},
    success: function(status) {
      console.log("Dashboard successfully deleted in the backend...");
      $("#modal-dashboard").modal("hide");
      notify_success("Deleted dashboard '"+name+"'");

      timer_query_rest(true);
      timer_update_views(true);
    },
    error: function(xhr, status, error) {
      console.log("ERROR deleting dashboard '"+name+"':"+error);
      notify_error("Failed: deleting dashboard '"+name+"'");
    }
  });
});

//Update labels
function set_current_datacube(){
  curr_datacube = get_datacube_from_url(main_iframe_get_url());
  label = "";
  try{
    label = "("+datacubes[curr_datacube]["title"]+")";
  }catch(error){};

  if($("#datacube-label").text() == label)
    return;

  $("#datacube-label").text(label);
}

function update_dashboard_list(){
  dashboard_list_preset = "";
  dashboard_list_custom = "";
  dashboard_urls_ = {}

  for(let i in dashboards){
    d = dashboards[i];
    if(d["dataCube"] != curr_datacube)
      continue;
    elem = '<div class="d-flex"><span class="w-100"><a class="dropdown-item dashboard" datacube="'+d["dataCube"]+'" href="#" dash-id="'+d["shortName"]+'">'+d["shortName"]+'</a></span>';
    if(d["preset"])
      dashboard_list_preset += elem+"</div>";
    else
      dashboard_list_custom += elem+'<span class="pr-3"><a class="dashboard-edit pl-1 cursor-pointer" dash-id="'+d["shortName"]+'"><span data-feather="edit-2"></span></a></span></div>';
    dashboard_urls_[d["hash"]] = d;
  }

  //Do not change DOM unless strictly necessary
  changes = false;
  dashboard_urls = dashboard_urls_;
  if($("#dashboard-list-custom").attr('content') != dashboard_list_custom){
    $("#dashboard-list-custom").attr('content', dashboard_list_custom);
    $("#dashboard-list-custom").html(dashboard_list_custom);
    changes = true;
  }
  if($("#dashboard-list-preset").html() != dashboard_list_preset){
    $("#dashboard-list-preset").attr('content', dashboard_list_preset);
    $("#dashboard-list-preset").html(dashboard_list_preset);
    changes = true;
  }

  //Don't do any more (expensive) changes if not strictly necessary
  if(!changes)
    return;

  if(dashboard_list_preset == "" && dashboard_list_custom == "")
    $("#dashboards").addClass("disabled");
  else
    $("#dashboards").removeClass("disabled");

  //Reprogram click handler
  feather.replace({ container: $("#nav-dashboards").get(0) }); //replace edit icons

  $("a.dashboard-edit").on("click", function(event){
    d = dashboards[$(this).attr('dash-id')];
    $("#modal-dashboard-id").val(d['id']);
    $("#modal-dashboard-url").val(d['hash']);
    $("#modal-dashboard-name").val(d['name']);
    $("#modal-dashboard-description").val(d['description']);
    $("#modal-dashboard-create").hide();
    $("#modal-dashboard-close").hide();
    $("#modal-dashboard-update").show();
    $("#modal-dashboard-delete").show();
    $("#modal-dashboard").modal("show");
  });
  $("#nav-dashboards a.dashboard" ).on("click", function(){
    d = dashboards[$(this).attr('dash-id')];
    main_iframe_set_url("turnilo/"+d["hash"]);
  });
}

function set_current_dashboard(){
  url = main_iframe_get_url();
  label = $("#dashboards-label")
  label_text = "Dashboards";
  if(url in dashboard_urls){
    d = dashboard_urls[url];
    label_text = "Dashboards("+d["name"]+")";
  }
  if(label.text() != label_text)
    label.text(label_text);
}

function timer_query_rest(){
  rest_query_datacubes();
  rest_query_dashboards();
}

function timer_update_views(){
  set_current_datacube();
  update_dashboard_list();
  set_current_dashboard();
}

//Main routines
$( document ).ready(function(){
  //Query REST periodically
  setInterval(timer_query_rest, 5000);
  timer_query_rest();

  //Update labels
  setInterval(timer_update_views, 250);
  timer_update_views();
});
