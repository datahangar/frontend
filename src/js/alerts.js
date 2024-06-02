function rand_str(){
  return (Math.random() + 1).toString(36).substring(2,16) + (Math.random() + 1).toString(36).substring(2,16);
}

function _notify(content, type){
  const id="div_" + rand_str();
  $("#notifications").append(
      '<div class="alert alert-'+type+'" style="display:none" role="alert" id="'+id+'">'+content+'</div>'
  )
  const selector = "#" + id;
  $(selector).slideDown(400);

  setTimeout(function() {
    $(selector).slideUp(600, function(id_){
      $(this).remove();
    });
  }, 2500);
}

function notify_success(content){
  _notify(content, "success");
}
function notify_info(content){
  _notify(content, "primary");
}
function notify_error(content){
  _notify(content, "danger");
}
function notify_warn(content){
  _notify(content, "warning");
}
