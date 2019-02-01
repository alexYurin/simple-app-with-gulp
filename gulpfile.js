'use strict';

const { src, dest, watch,
        series, parallel } = require('gulp'),

      $babelify          = require('babelify'),
      $browserify        = require('browserify'),
      $buffer            = require('vinyl-buffer'),
      $tap               = require('gulp-tap'),
      $minify            = require('gulp-babel-minify'),
      $sourcemaps        = require('gulp-sourcemaps'),
      $gulpIf            = require('gulp-if'),
      $sass              = require('gulp-sass'),
      $pug               = require('gulp-pug'),
      $server            = require('browser-sync').create(),
      $concat            = require('gulp-concat'),
      $cssnano           = require('gulp-cssnano'),
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
  pug: {
    src: 'src/pug/index.pug',
  },
  sass: {
    src: 'src/sass/**/*.sass',
    dest: 'src/css'
  },
  js: {
    vendors: [
      isDevelopment ? 'src/vendors/jquery/dist/jquery.js' : 'src/vendors/jquery/dist/jquery.min.js',
    ],
    src: 'src/js/scripts/**/*.js',
    dest: 'src/js',
    bundle: 'src/js/bundle.js'
  },  
  fonts: 'src/fonts/**/*',
  img: 'src/img/**/*'
};

function pug() {
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

function sass() {
  return $combiner(
    src(paths.sass.src),
    $gulpIf(isDevelopment, $sourcemaps.init()),
    $sass(),
    $autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }),
    $cssnano(),
    $concat('main.min.css'),
    $gulpIf(isDevelopment, $sourcemaps.write(), dest(paths.dist + '/css')),
    dest(paths.sass.dest),
    $server.stream()
  ).on('error', $notify.onError());
};

function js() {
  return $combiner(
    src(paths.js.vendors.concat(paths.js.src), { read: false }),
    $gulpIf(isDevelopment, $sourcemaps.init()),
    $tap(function(file) {
      file.contents = $browserify(file.path)
        .transform($babelify, { presets: ['@babel/env'] })
        .bundle()
    }),
    $buffer(),
    $gulpIf(isDevelopment, $sourcemaps.write(), $minify()),
    $concat('bundle.js'),
    $gulpIf(!isDevelopment, dest(paths.dist + '/js')),
    dest(paths.js.dest),
    $server.stream() 
  ).on('error', $notify.onError());
};

function buildImg() {
  return src(paths.img)
    .pipe($imagemin([
      $imagemin.gifsicle({ interlaced: true }),
      $imagemin.jpegtran({ progressive: true }),
      $imagemin.optipng({ optimizationLevel: 5 }),
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
  watch(paths.pug.src, series(pug));  
  watch(paths.sass.src, series(sass));
  watch(paths.js.src, series(js));
  done();
};


const dev = series(
  /*
  $ gulp build
  */
  parallel(pug, sass, js),
  parallel(serve, watchFiles)
);

const prod = series(
  /*
  $ NODE_ENV=production gulp build
  */
  clean,
  parallel(pug, sass, js),
  parallel(buildImg, buildFonts)
);

exports.clear = series(clear);
exports.build = isDevelopment ? dev : prod;



