loadSnowPreset(tsParticles);

tsParticles.load('tsparticles', {
  preset: 'snow',
  fullScreen: {
    enable: true,
    zIndex: 1,
  },
  particles: {
    number: {
      value: 35,
      density: {
        enable: true,
        value_area: 500,
      },
    },
    color: {
      value: '#FDFCFE',
    },
    shape: {
      type: 'circle',
    },
    opacity: {
      value: 0.4,
      random: false,
      anim: {
        enable: true,
        speed: 0.1,
        opacity_min: 0.1,
        sync: false,
      },
    },
    size: {
      value: 4,
      random: true,
      anim: {
        enable: true,
        speed: 1,
        size_min: 0.1,
        sync: false,
      },
    },
    line_linked: {
      enable: false,
      distance: 500,
      color: '#ffffff',
      opacity: 0.4,
      width: 2,
    },
    move: {
      enable: true,
      speed: 1.2,
      direction: 'bottom-left',
      random: false,
      straight: false,
      out_mode: 'out',
      attract: {
        enable: false,
        rotateX: 600,
        rotateY: 1200,
      },
    },
  },
  interactivity: {
    events: {
      onhover: {
        enable: false,
        mode: 'bubble',
      },
      onclick: {
        enable: false,
        mode: 'repulse',
      },
      resize: false,
    },
    modes: {
      grab: {
        distance: 400,
        line_linked: {
          opacity: 0.5,
        },
      },
      bubble: {
        distance: 400,
        size: 4,
        duration: 0.3,
        opacity: 0.8,
        speed: 3,
      },
      repulse: {
        distance: 200,
      },
      push: {
        particles_nb: 4,
      },
      remove: {
        particles_nb: 2,
      },
    },
  },
  retina_detect: true,
  background: {
    color: '',
    image: '',
    position: '50% 50%',
    repeat: 'no-repeat',
    size: 'cover',
  },
});
