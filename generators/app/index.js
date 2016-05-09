/* eslint-disable */

'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var path = require('path');
var yosay = require('yosay');
var recursive = require('recursive-readdir');

module.exports = yeoman.generators.Base.extend({
	prompting: function() {
		var done = this.async();

		this.appname = path.basename(this.destinationRoot());
		this.log(yosay(
			'Welcome to ' + chalk.red('generator-tldr') + '\n' +
			'Nunjucks templating, Gulp, SCSS, and Babel (ES6)'
		));

		var prompts = [{
			type: 'confirm',
			name: 'includeNunjucks',
			message: 'Would you like to include Nunjucks?',
			default: true
		},{
			type    : 'input',
			name    : 'authorname',
			message : 'What\'s your name?',
			store   : true
		},{
			type    : 'input',
			name    : 'authoremail',
			message : 'What\'s your email address?',
			store   : true
		}];

		this.prompt(prompts, function (answers) {
			this.authorname = answers.authorname;
			this.authoremail = answers.authoremail;
			this.includeNunjucks = answers.includeNunjucks;
			done();
		}.bind(this));
	},

	writing: function() {
		const done = this.async();
		const sourceRoot = this.sourceRoot();

		const ignore = [];
		if (this.includeNunjucks) {
			ignore.push('*.html');
		} else {
			ignore.push('*.nunjucks');
			ignore.push('*.md');
			ignore.push('.templa.json');
		}

		recursive(sourceRoot, ignore, (err, files) => {
			files = files.map(function(file) {
				return file.replace(sourceRoot, '').replace(/[\/\\]/, '');
			});

			files.forEach(file => {
				if (file.match(/\.(js|json|html|nunjucks)$/)) {
					this.fs.copyTpl(
						this.templatePath(file),
						this.destinationPath(file),
						this
					);
				} else {
					this.fs.copy(
						this.templatePath(file),
						this.destinationPath(file)
					);
				}
			});

			done();
		});
	},

	install: function() {
		this.npmInstall();
	},
});
