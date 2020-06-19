'use strict';

const path = require('path');
const {
  series,
  src,
  dest
} = require('gulp');
const sass = require('gulp-sass');
const cssnano = require('cssnano');
const gpostcss = require('gulp-postcss');
const cssmin = require('gulp-cssmin');
const postcssMix = require(path.resolve(__dirname, '../../build/postcss-plugin-mix'));

function compile() {
  const baseVars = {};
  const vars = {};
  return src('./src/*.scss')
    .pipe(sass.sync())
    .pipe(gpostcss([
      postcssMix({ baseVars, vars, dest: path.resolve(__dirname, '../../src/utils/color.json') }),
      cssnano()
    ]))
    .pipe(dest('./lib'));
}

function copyfont() {
  return src('./src/fonts/**')
    .pipe(cssmin())
    .pipe(dest('./lib/fonts'));
}

exports.build = series(compile, copyfont);
