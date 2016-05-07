/* eslint-disable no-console,no-underscore-dangle,no-param-reassign */
const watchify = require('watchify');
const browserify = require('browserify');
const gulp = require('gulp');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const browserSync = require('browser-sync');
const del = require('del');
const $ = require('gulp-load-plugins')();
const fs = require('fs');<% if (includeNunjucks) { %>
const path = require('path');
const yamlFront = require('yaml-front-matter');
const marked = require('marked');
const nunjucks = require('nunjucks');
const mkpath = require('mkpath');<% } %>


function onError(err) {
	$.util.beep();
	$.util.log($.util.colors.red('Compilation Error\n'), err.toString());
	this.emit('end');
}

/**
 * This task removes all files inside the 'dist' directory.
 */
gulp.task('clean', () =>
	del.sync('./dist/**/*')
);

/**
 * Media
 */
gulp.task('buildmedia', () =>
	gulp.src(['./src/media/**'])
		.pipe($.plumber())
		.pipe(gulp.dest('./dist/media'))
);

/**
 * Layouts
 */
gulp.task('cleanhtml', del.bind(null, ['tmp/**/*.html']));

<% if (includeNunjucks) { %>
gulp.task('html', ['cleanhtml'], () => {
	const baseDataDir = './src/data';
	const baseTemplateDir = './src/nunjucks';
	const pageTypes = JSON.parse(fs.readFileSync('.pages.json'));
	const pages = [];

	pageTypes.forEach((pageType) => {
		if (!pageType.dataDir) {
			pages.push(pageType);
		} else {
			const dirContents = fs.readdirSync(`${baseDataDir}/${pageType.dataDir}`);
			dirContents.forEach((dataFile) => {
				const data = yamlFront.loadFront(`${baseDataDir}/${pageType.dataDir}/${dataFile}`);
				data.__content = data.__content.trim();
				data.slug = data.slug || dataFile.replace(/\..*/, '');
				const url = pageType.url.replace(/:slug/g, data.slug);

				if (dataFile.match(/\.md$/)) {
					data.__content = marked(data.__content);
				}

				pages.push(Object.assign({}, pageType, {
					url,
					data,
				}));
			});
		}
	});

	nunjucks.configure(baseTemplateDir);

	pages.forEach((page) => {
		const filename = `${page.url.replace(/\/$/, '/index').replace(/^\//, '')}.html`;
		const filepath = `./tmp/${filename}`;
		const output = nunjucks.render(`${page.template}.html.nunjucks`, page.data);
		mkpath.sync(path.dirname(filepath));
		fs.writeFileSync(filepath, output);
	});

	browserSync.reload();
});
<% } else { %>
gulp.task('html', () =>
	gulp
		.src('./src/html/**/*.html')
		.pipe(gulp.dest('./tmp'))
		.pipe(browserSync.stream({ once: true }))
);
<% } %>

gulp.task('buildhtml', ['html'], () =>
	gulp
		.src('./tmp/**/*.html')
		.pipe($.htmlmin({ collapseWhitespace: true }))
		.pipe(gulp.dest('./dist'))
);

/**
 * Scripts
 */
gulp.task('cleanjs', del.bind(null, ['./tmp/js/**/*']));

function bundleJs(watch) {
	const customOpts = {
		entries: ['./src/es6/app.es6'],
		transform: ['babelify'],
		debug: true, // Enables source maps
	};
	const opts = Object.assign({}, browserify.args, customOpts);
	const b =  watch ? watchify(browserify(opts)) : browserify(opts);

	return b.bundle()
		.on('error', onError)
		.pipe($.plumber())
		.pipe(source('app.es6'))
		.pipe(buffer())
		.pipe($.sourcemaps.init({ loadMaps: true }))
		.pipe($.uglify())
		.pipe($.rename({
			extname: '.js',
		}))
		.pipe($.sourcemaps.write())
		.pipe(gulp.dest('./tmp/js'))
		.pipe(browserSync.stream({ once: true }));
}

gulp.task('js', ['cleanjs'], () => bundleJs());
gulp.task('watchjs', ['cleanjs'], () => bundleJs(true));

gulp.task('buildjs', ['js'], () =>
	gulp
		.src('./tmp/js/*.js')
		.pipe($.uglify())
		.pipe(gulp.dest('./dist/js'))
);

/**
 * Styles
 */
gulp.task('cleancss', del.bind(null, ['./tmp/css/**/*']));

gulp.task('css', ['cleancss'], () =>
	gulp
		.src('./src/scss/**/*.scss')
		.pipe($.plumber({
			errorHandler: onError,
		}))
		.pipe($.sourcemaps.init())
		.pipe($.sass({
			outputStyle: 'compressed',
			onError: console.error.bind(console, 'Sass error:'),
		}))
		.pipe($.autoprefixer())
		.pipe($.sourcemaps.write(''))
		.pipe(gulp.dest('./tmp/css'))
		.pipe(browserSync.stream())
 );

gulp.task('buildcss', ['css'], () =>
	gulp
		.src('./tmp/css/*.css')
		.pipe($.uglifycss())
		.pipe(gulp.dest('./dist/css'))
);


/**
 * Main
 */
gulp.task('dev', ['html', 'js', 'css']);
gulp.task('build', ['buildhtml', 'buildjs', 'buildcss', 'buildmedia']);

gulp.task('clean', del.bind(null, ['tmp', 'dist']));


gulp.task('watch', ['dev', 'watchjs'], () => {
	gulp.watch('src/es6/**/*', ['js']);
	gulp.watch('src/scss/**/*', ['css']);<% if (includeNunjucks) { %>
	gulp.watch('src/nunjucks/**/*', ['html']);
	gulp.watch('src/data/**/*', ['html']);
	gulp.watch('.pages.json', ['html']);<% } else { %>
	gulp.watch('src/html/**/*', ['html']);<% } %>
	gulp.watch('src/media/**/*').on('change', browserSync.reload);
});


function appendHtml(dir, req, res, next) {
	if (req.url.match(/\/[^.]+$/)) {
		fs.access(`${dir}${req.url}.html`, fs.F_OK, (err) => {
			if (!err) {
				req.url += '.html';
			}
			next();
		});
	} else {
		next();
	}
}

gulp.task('serve', ['watch'], () =>
	browserSync({
		server: {
			baseDir: ['./tmp', './src'],
			middleware: [
				appendHtml.bind(this, './tmp'),
			],
		},
	})
);

gulp.task('serve:dist', ['build'], () =>
	browserSync({
		server: {
			baseDir: ['./dist'],
			middleware: [
				appendHtml.bind(this, './dist'),
			],
		},
	})
);


gulp.task('default', ['serve']);
