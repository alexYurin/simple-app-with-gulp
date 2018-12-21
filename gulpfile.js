'use strict';

const { src, dest, watch,
        series, parallel } = require('gulp'),

      $babel             = require('gulp-babel'),
      $minify            = require('gulp-babel-minify'),
      $sourcemaps        = require('gulp-sourcemaps'),
      $gulpIf            = require('gulp-if'),
      $sass              = require('gulp-sass'),
      $pug               = require('gulp-pug'),
      $server            = require('browser-sync').create(),
      $concat            = require('gulp-concat'),
      $cssnano           = require('gulp-cssnano'),
      $rename            = require('gulp-rename'),
      $imagemin          = require('gulp-imagemin'),
      $autoprefixer      = require('gulp-autoprefixer'),
      $del               = require('del'),
      $notify            = require('gulp-notify'),
      $combiner          = require('stream-combiner2').obj,
      $cache             = require('gulp-cache');

const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';

var paths = {
  base: 'src',
  dist: 'dist',
  html: {
    prod: 'src/index.html'
  },
  css: {
    src: 'src/css/main.css',
    libs: 'src/css/libs/libs.css',
    dest: 'src/css',
    prod: 'src/css/main.min.css',
  },
  sass: {
    src: 'src/sass/**/*.sass',
    dest: 'src/css'
  },
  pug: {
    src: 'src/pug/index.pug',
  },
  js: {
    vendors: [
      'src/vendors/jquery/dist/jquery.min.js',
    ],
    src: 'src/js/scripts/**/*.js',
    dest: 'src/js',
    bundle: 'src/js/bundle.js'
  },  
  fonts: 'src/fonts/**/*',
  img: 'src/img/**/*'
};

function html() {
  return $combiner(
    src(paths.pug.src),
    $gulpIf(isDevelopment, $sourcemaps.init()),
    $pug({ pretty: true }),
    $gulpIf(isDevelopment, $sourcemaps.write()),
    dest(paths.base),
    $gulpIf(!isDevelopment, dest(paths.dist)),
    $server.stream()
  ).on('error', $notify.onError());
};

function css() {
  return src([paths.css.libs, paths.css.src])
    .pipe($concat('main.css'))
    .pipe($cssnano())
    .pipe($rename({ suffix: '.min' }))
    .pipe(dest(paths.css.dest))
    .pipe($gulpIf(!isDevelopment, dest(paths.dist + '/css')))
    .pipe($server.stream());
};

function sass() {
  return $combiner(
    src(paths.sass.src),
    $gulpIf(isDevelopment, $sourcemaps.init()),
    $sass(),
    $autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }),
    $gulpIf(isDevelopment, $sourcemaps.write()),
    dest(paths.sass.dest),
    $server.stream()
  ).on('error', $notify.onError());
};

function js() {
  return $combiner(
    src(paths.js.vendors.concat(paths.js.src)),
    $gulpIf(isDevelopment, $sourcemaps.init()),
    $babel({ presets: ['env'] }),
    $concat('bundle.js'),
    $gulpIf(isDevelopment, $sourcemaps.write(), $minify()),
    dest(paths.js.dest),
    $gulpIf(!isDevelopment, dest(paths.dist + '/js')),
    $server.stream()
  ).on('error', $notify.onError());
};

function buildImg() {
  return src(paths.img)
    .pipe($imagemin([
      $imagemin.gifsicle({ interlaced: true }),
      $imagemin.jpegtran({ progressive: true }),
      $imagemin.optipng({ optimizationLevel: true }),
      $imagemin.svgo({
        plugins: [
          {
            removeViewBox: false,
            collapseGroups: true
          }
        ]
      })])
    )
    .pipe(dest(paths.dist + '/img'));
};


function buildFonts() {
  return src(paths.fonts).pipe(dest(paths.dist + '/fonts'))
};

function clean() {
  return $del(paths.dist);
};

function clear() {
  return $cache.clearAll();
};

function serve(done) {
  $server.init({
    server: { baseDir: paths.base },
    port: 3000,
    notify: false
  });
  done();
};

function watchFiles(done) {
  watch(paths.pug.src, series(html));  
  watch([paths.sass.src, paths.css.libs], series(sass, css));
  watch(paths.js.src, series(js));
  done();
};


const dev = series(
  /*
  $ gulp build
  */
  parallel(html, sass, css, js),
  parallel(serve, watchFiles)
);

const prod = series(
  /*
  $ NODE_ENV=production gulp build
  */
  clean,
  parallel(html, sass, css, js),
  parallel(buildFonts, buildImg)
);

exports.clear = series(clear);
exports.build = isDevelopment ? dev : prod;



