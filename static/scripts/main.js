
function lerp(il, i, ih, ol, oh) {
  return ((i - il) / (ih - il)) * (oh - ol) + ol;
}

function clerp(il, i, ih, ol, oh) {
  return lerp(il, Math.max(il, Math.min(ih, i)), ih, ol, oh);
}

var hero, header;

function parallax(scroll) {
  hero.css('top', (scroll * 0.5) + 'px');
  $('#about-me').css('top', (scroll * 0.4) + 'px');

  scroll = clerp(0, scroll, $(window).height() - $('#header').height() * 3, 0, 1);

  $('#header').css('background-color', 'rgba(0, 0, 0, ' + scroll + ')');
  $('#header').css('height', clerp(0, scroll, 1, 128, 64) + 'px');
}

$(document).ready(function() {
  hero = $('#featured-project .hero');
  header = $('#header');

  setTimeout(function() {
    parallax($(window).scrollTop());
  }, 0);
  
  $(window).scroll(function(ev) {
    parallax($(window).scrollTop());
  });
  
});
