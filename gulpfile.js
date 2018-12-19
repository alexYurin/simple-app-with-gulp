const { src, dest, watch,
        series, parallel } = require('gulp'),

      $babel             = require('gulp-babel'),
      $minify            = require("gulp-babel-minify"),
      $sass              = require('gulp-sass'),
      $pug               = require('gulp-pug'),
      $server            = require('browser-sync').create(),
      $concat            = require('gulp-concat'),
      $cssnano           = require('gulp-cssnano'),
      $rename            = require('gulp-rename'),
      $imagemin          = require('gulp-imagemin'),
      $autoprefixer      = require('gulp-autoprefixer'),
      $del               = require('del'),
      $cache             = require('gulp-cache');

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
    prod: 'src/js/scripts.min.js'
  },  
  fonts: 'src/fonts/**/*',
  img: 'src/img/**/*'
};

function html() {
  return src(paths.pug.src)
    .pipe($pug({ pretty: true }))
    .pipe(dest(paths.base))
    .pipe($server.reload({stream:true}));
};

function css() {
  return src([paths.css.libs, paths.css.src])
    .pipe($concat('main.min.css'))
    .pipe($cssnano())
    .pipe(dest(paths.css.dest))
    .pipe($server.reload({stream:true}));
};

function sass() {
  return src(paths.sass.src)
    .pipe($sass())
    .pipe($autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
    .pipe(dest(paths.sass.dest))
    .pipe($server.reload({stream:true}));
};

function js() {
  return src(paths.js.vendors.concat(paths.js.src))
    .pipe($babel({ presets: ['env'] }))
    .pipe($concat('scripts.min.js'))
    .pipe($minify())
    .pipe(dest(paths.js.dest))
    .pipe($server.reload({stream:true}));
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
  watch(paths.pug.src, html);  
  watch([paths.sass.src, paths.css.libs], series(sass, css));
  watch(paths.js.src, js);
  done();
};

function clean() {
  return $del(paths.dist);
};

function clear() {
  return $cache.clearAll();
};

function compile(done) {
  parallel(html, sass, css, js);
  done();
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

function buildHTML(done) {
  src(paths.html.prod).pipe(dest(paths.dist));
  done();
};

function buildCSS(done) {
  src(paths.css.prod).pipe(dest(paths.dist + '/css'));
  done();
};

function buildJS(done) {
  src(paths.js.prod).pipe(dest(paths.dist + '/js'));
  done();  
};

function buildFonts(done) {
  src(paths.fonts).pipe(dest(paths.dist + '/fonts'));
  done();
};

exports.clear = series(clear);
exports.dev   = series(compile, serve, watchFiles);
exports.prod  = series(clean, compile, 
                  parallel(buildHTML, buildCSS, buildJS, buildFonts, buildImg));



