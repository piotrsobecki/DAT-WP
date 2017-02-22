/* jshint node:true */
const path = require('path');

module.exports = function( grunt ){
	'use strict';

	var deps_file = "dependencies.json";
	var config_file = "config.json";
	var target_plugins_dir = "./target/plugins";
	var config = grunt.file.readJSON(config_file);

	grunt.config.init({
		
		clean: [
			'target'
		],
		// setting folder templates
		dirs: {
			css: 'assets/css',
			less: 'assets/css',
			js: 'assets/js'
		},

		// Compile all .less files.
		less: {
			compile: {
				options: {
					// These paths are searched for @imports
					paths: ['<%= less.css %>/']
				},
				files: [{
					expand: true,
					cwd: '<%= dirs.css %>/',
					src: [
						'*.less',
						'!mixins.less'
					],
					dest: '<%= dirs.css %>/',
					ext: '.css'
				}]
			}
		},

		// Minify all .css files.
		cssmin: {
			minify: {
				expand: true,
				cwd: '<%= dirs.css %>/',
				src: ['*.css'],
				dest: '<%= dirs.css %>/',
				ext: '.css'
			}
		},

		// Minify .js files.
		uglify: {
			options: {
				preserveComments: 'some'
			},
			jsfiles: {
				files: [{
					expand: true,
					cwd: '<%= dirs.js %>/',
					src: [
						'*.js',
						'!*.min.js',
						'!Gruntfile.js',
					],
					dest: '<%= dirs.js %>/',
					ext: '.min.js'
				}]
			}
		},

		// Watch changes for assets
		watch: {
			less: {
				files: [
					'<%= dirs.less %>/*.less',
				],
				tasks: ['less', 'cssmin'],
			},
			js: {
				files: [
					'<%= dirs.js %>/*js',
					'!<%= dirs.js %>/*.min.js'
				],
				tasks: ['uglify']
			}
		},

		zip_directories: {
			current: {
				files: [
				{
					expand: true,
					cwd: 'src/plugins/',
					src: ['*'],
					dest: 'target/plugins/'
				},
				{
					expand: true,
					cwd: 'src/themes/',
					src: ['*'],
					dest: 'target/themes/'
				}
			]
			}
		},
		'wp-cli':{
			uninstall_plugin:{
                command:'plugin',
                subcommand:'uninstall',
                arguments:['"wp-challenge"','--deactivate'],
                options:[],
                path:config.wordpress_dir
			},
			install_plugin:{
				command:'plugin',
                subcommand:'install',
                arguments:['target/plugins/wp-challenge.zip','--activate'],
				options:[],
				path:config.wordpress_dir
			},
            install_dependency: {
                command:'plugin',
                subcommand:'install',
                options:[],
                path:config.wordpress_dir
            }
		}
	});

    grunt.registerTask('usetheforce_on',
        'force the force option on if needed',
        function() {
            if ( !grunt.option( 'force' ) ) {
                grunt.config.set('usetheforce_set', true);
                grunt.option( 'force', true );
            }
        });

    grunt.registerTask('usetheforce_restore',
        'turn force option off if we have previously set it',
        function() {
            if ( grunt.config.get('usetheforce_set') ) {
                grunt.option( 'force', false );
            }
        });
		
    grunt.task.registerTask('wp-cli-install-dep', 'Install wp cli dependency.', function() {
		var args = Array.prototype.slice.call(arguments);
		console.log(args);
		grunt.config.merge({
			'wp-cli':{
				'install_dependency':{
				   'arguments':args
				}
			}
		});
		grunt.task.run(['wp-cli:install_dependency']);
    });
	
    grunt.task.registerTask('wp-cli-install-deps', 'Install wp cli dependencies.', function(dependenciesFile) {
		console.log(dependenciesFile);
        var dependency = grunt.file.readJSON(dependenciesFile);
		var tasks = [];
        for (var i = 0; i < dependency.plugins.length; i++) {
			tasks.push('wp-cli-install-dep:'+dependency.plugins[i].join(':'));
        }
		grunt.task.run(tasks);
    });
	
	grunt.task.registerTask('wp-cli-uninstall-plugin', 'Uninstall plugins.', function(plugin_name) {
		grunt.config.merge({
			'wp-cli':{
				'uninstall_plugin':{
					 'arguments':[plugin_name,'--deactivate']
				}
			}
		});
		grunt.task.run(['wp-cli:uninstall_plugin']);
    });
	
    grunt.task.registerTask('wp-cli-uninstall-plugins', 'Uninstall plugins.', function(pluginsDir) {
		var plugins = grunt.file.expand({filter: "isFile", cwd: pluginsDir}, ["*.zip"]);
		var tasks = [];
        for (var i = 0; i < plugins.length; i++) {
			var plugin_file = pluginsDir + "/" + plugins[i];
			var plugin_name = path.basename(plugin_file,'.zip');
			tasks.push('wp-cli-uninstall-plugin:'+plugin_name);
        }
		grunt.task.run(tasks);
    });
	
	grunt.task.registerTask('wp-cli-install-plugin', 'Install plugins.', function(plugin_file) {
		grunt.config.merge({
			'wp-cli':{
				'install_plugin':{
					 'arguments':[plugin_file,'--activate']
				}
			}
		});
		grunt.task.run(['wp-cli:install_plugin']);
    });
	
	grunt.task.registerTask('wp-cli-install-plugins', 'Install plugins.', function(pluginsDir) {
		var plugins = grunt.file.expand({filter: "isFile", cwd: pluginsDir}, ["*.zip"]);
		var tasks = [];
        for (var i = 0; i < plugins.length; i++) {
			var plugin_file = pluginsDir + "/" + plugins[i];
			tasks.push('wp-cli-install-plugin:'+plugin_file);
        }
		grunt.task.run(tasks);
    });
	

	
	
	grunt.loadNpmTasks('grunt-contrib-clean');

    // Load in `grunt-zip`
    grunt.loadNpmTasks('grunt-wp-cli');
	grunt.loadNpmTasks('grunt-zip-directories');

	// Load NPM tasks to be used here
	grunt.loadNpmTasks( 'grunt-contrib-less' );
	grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );

    // Register tasks
    grunt.registerTask(
		'install', [
			'less',
			'cssmin',
			'uglify',
			'zip_directories'
		]
	);
	
    // Register tasks
    grunt.registerTask(
		'undeploy', [
			'usetheforce_on', //Prevents task from failing for example if plugin is not installed / activated
			'wp-cli-uninstall-plugins:'+target_plugins_dir,
			'usetheforce_restore' //Restores default configuration
		]
	);
	
	// Register tasks
    grunt.registerTask(
		'deploy-deps', [
			'usetheforce_on', //Prevents task from failing for example if plugin is not installed / activated
			'wp-cli-install-deps:'+deps_file,
			'usetheforce_restore' //Restores default configuration
		]
	);
	
	// Register tasks
    grunt.registerTask(
		'deploy-no-deps', [
			'wp-cli-install-plugins:'+target_plugins_dir
		]
	);

    // Register tasks
    grunt.registerTask(
		'deploy', [
			'deploy-deps',
			'deploy-no-deps'
		]
	);
	
    // Register tasks
    grunt.registerTask(
		'default', [
			'clean',
			'install',
			'undeploy',
			'deploy'
		]
	);

};
