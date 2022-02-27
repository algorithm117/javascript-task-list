const playIconContainer =
  document.querySelector('#play-icon');

let state = 'play';

const animation = lottieWeb.loadAnimation({
  container: playIconContainer,
  path: 'https://maxst.icons8.com/vue-static/landings/animated-icons/icons/pause/pause.json',
  renderer: 'svg',
  loop: false,
  autoplay: false,
  name: 'Demo Animation',
});
