/*
* Greedy Navigation
*
* http://codepen.io/lukejacksonn/pen/PwmwWV
*
*/

var $nav = $('#site-nav');
var $btn = $('#site-nav > button');
var $vlinks = $('#site-nav .visible-links');
var $vlinks_persist_tail = $vlinks.children("*.persist.tail");
var $hlinks = $('#site-nav .hidden-links');

function updateNav() {
  // Measure the current locale and font widths, not breakpoints cached in a
  // different layout. Restore entries in order before deciding what fits.
  var tail = $vlinks_persist_tail.first();
  if (tail.length) $hlinks.children().insertBefore(tail);
  else $hlinks.children().appendTo($vlinks);
  $btn.addClass('hidden');
  var availableSpace = $nav.width();
  while ($vlinks.width() > availableSpace && $vlinks.children(':not(.persist)').length) {
    $btn.removeClass('hidden');
    availableSpace = $nav.width() - $btn.outerWidth(true) - 30;
    $vlinks.children(':not(.persist)').last().prependTo($hlinks);
  }
  var hiddenCount = $hlinks.children().length;
  if (!hiddenCount) {
    $btn.addClass('hidden').removeClass('close').attr('aria-expanded', 'false');
    $hlinks.addClass('hidden');
  }
  $btn.attr('count', hiddenCount);

  // update masthead height and the body/sidebar top padding
  var mastheadHeight = $('.masthead').height();
  $('body').css('padding-top', mastheadHeight + 'px');
  if ($(".author__urls-wrapper button").is(":visible")) {
    $(".sidebar").css("padding-top", "");
  } else {
    $(".sidebar").css("padding-top", mastheadHeight + "px");
  }

}

// The bundle is loaded as a module; locale switching calls this explicit API.
window.updateNav = updateNav;
if (document.fonts) document.fonts.ready.then(updateNav);

// Window listeners

$(window).on('resize', function () {
  updateNav();
});
if (screen.orientation) screen.orientation.addEventListener("change", function () {
  updateNav();
});

$btn.on('click', function () {
  $hlinks.toggleClass('hidden');
  $(this).toggleClass('close');
  $(this).attr('aria-expanded', !$hlinks.hasClass('hidden'));
});

updateNav();
