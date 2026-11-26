window.CONFIG = {
  name: 'TBX3',
  aka: 'Geld $ebinski',

  links: [
    { label: 'Steam', url: 'https://steamcommunity.com/id/ronnyronan/' },
    { label: 'Tbx3 discord', url: 'https://discord.com/users/1021700689887494145' },
  ],

  lastfm: { user: 'Ragaire', apiKey: '5e3ba1781e3310c6e705010d538f9b33' },

  favouriteGames: [''],

  // Opening intro: drop wallpapers in intro/ and list them here.
  // Each entry: 'intro/x.jpg' or { desktop: 'intro/x.jpg', mobile: 'intro/x-mobile.jpg' }
  // (portrait screens get mobile). Leave images empty to turn the intro off.
  intro: {
    seconds: 2.6, // total length before the site appears
    show: 1,      // how many random wallpapers to cycle per visit
    images: [
      { desktop: 'intro/2611-desktop.jpg', mobile: 'intro/2611-mobile.jpg' },
      { desktop: 'intro/2610-desktop.jpg', mobile: 'intro/2610-mobile.jpg' },
      { desktop: 'intro/2609-desktop.jpg', mobile: 'intro/2609-mobile.jpg' },
      { desktop: 'intro/2608-desktop.jpg', mobile: 'intro/2608-mobile.jpg' },
      { desktop: 'intro/2607-desktop.jpg', mobile: 'intro/2607-mobile.jpg' },
      { desktop: 'intro/2606-desktop.jpg', mobile: 'intro/2606-mobile.jpg' },
      { desktop: 'intro/2604-desktop.jpg', mobile: 'intro/2604-mobile.jpg' },
      { desktop: 'intro/2603-desktop.jpg', mobile: 'intro/2603-mobile.jpg' },
      { desktop: 'intro/2602-desktop.jpg', mobile: 'intro/2602-mobile.jpg' },
      { desktop: 'intro/2601-desktop.jpg', mobile: 'intro/2601-mobile.jpg' },
      { desktop: 'intro/2512-desktop.jpg', mobile: 'intro/2512-mobile.jpg' },
      { desktop: 'intro/2511-desktop.jpg', mobile: 'intro/2511-mobile.jpg' },
    ],
  },

  limits: { topSongs: 5, topAlbums: 10 },
};
