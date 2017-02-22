/* jshint node:true */
const path = require('path');
const merge = require('merge');

module.exports = function( grunt ){
	//'use strict';

	var config_file = "config.json";
	var target_plugins_dir = "./target/plugins";
	
	var config = grunt.file.readJSON(config_file);
	console.log(config);

	
	var env_config_file = "config."+config.properties.env+".json";
	
	var config_env = grunt.file.readJSON(env_config_file);
	console.log(config_env);

	var config = merge.recursive(true, config, config_env);
	
	console.log(config);

	grunt.config.init({
		

		// setting folder templates
		dirs: {
			css: 'src/*/*/assets/css',
			less: 'src/*/*/assets/css',
			js: 'src/*/*/assets/js',
			plugins: 'src/plugins/',
            themes: 'src/themes/',
			target: 'target',
            target_themes: '<%= dirs.target %>/themes',
            target_plugins: '<%= dirs.target %>/plugins'
		},
        clean: [
            '<%= dirs.target %>/'
        ],
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
					'<%= dirs.less %>/*.less'
				],
				tasks: ['less', 'cssmin','undeploy','deploy-no-deps']
			},
			js: {
				files: [
					'<%= dirs.js %>/*js',
					'!<%= dirs.js %>/*.min.js'
				],
				tasks: ['uglify','package','undeploy','deploy-no-deps']
			}
		},

		zip_directories: {
			current: {
				files: [
				{
					expand: true,
					cwd: '<%= dirs.plugins %>',
					src: ['*'],
					dest: '<%= dirs.target_plugins %>'
				},
				{
					expand: true,
					cwd: '<%= dirs.themes %>',
					src: ['*'],
					dest: '<%= dirs.target_themes %>'
				}
			]
			}
		}
	});

    grunt.registerTask('usetheforce_on', 'force the force option on if needed',  function() {
		if ( !grunt.option( 'force' ) ) {
			grunt.config.set('usetheforce_set', true);
			grunt.option( 'force', true );
		}
    });

    grunt.registerTask('usetheforce_restore', 'Turn force option off if we have previously set it', function() {
		if ( grunt.config.get('usetheforce_set') )   {
			grunt.option( 'force', false );
		}
	});
		
		
	grunt.task.registerTask('wp-cli-invoke', 'WP-CLI command invoker', function() {
		var args = Array.prototype.slice.call(arguments);
		var command = args[0];
		var subcommand = args[1];
		var arguments = args.slice(2, args.length);
		grunt.config.merge({
			'wp-cli':{
				'invoke_command':{
					'path':config.properties.wordpress_dir,
					'command':command,
					'subcommand':subcommand,
					'arguments':arguments
				}
			}
		});
		grunt.task.run(['wp-cli:invoke_command']);
    });
		
	
	function get_task(){
		return arguments.join(':');
		
	}
	
	function get_wp_cli_task(command,subcommand,args){
		console.log(args);
		return 'wp-cli-invoke:'+command+':'+subcommand+':'+args.join(":");
	}
	
	
	function get_wp_cli_tasks_for_args(command,subcommand,arguments){
		var tasks = [];
		if (arguments.length>0){
			for (var i = 0; i < arguments.length; i++) {
				tasks.push(get_wp_cli_task(command,subcommand,arguments[i]));
			}
		}
		return tasks;
	}
	
    grunt.task.registerTask('wp-cli-dependencies', 'Manage wp cli dependencies.', function() {
		var tasks = [];
		var wp_cli_commands = config.dependencies['wp-cli'];
		for (var command in wp_cli_commands) {
			var subcommands = wp_cli_commands[command];
			for (var subcommand in subcommands){
				tasks = tasks.concat(get_wp_cli_tasks_for_args(command,subcommand,subcommands[subcommand]));
			}
		}
		console.log(tasks);
		grunt.task.run(tasks);
    });
	
	
    grunt.task.registerTask('wp-cli-uninstall-plugins', 'Uninstall build plugins.', function(pluginsDir) {
		var pluginFiles = grunt.file.expand({filter: "isFile", cwd: pluginsDir}, ["*.zip"]);
		var plugins = [];
        for (var i = 0; i < pluginFiles.length; i++) {
			var plugin_file = pluginsDir + "/" + pluginFiles[i];
			var plugin_name = path.basename(plugin_file,'.zip');
			plugins.push([plugin_name,'--deactivate']);
        }
		grunt.task.run(get_wp_cli_tasks_for_args('plugin','uninstall',plugins));
    });
	
	
	grunt.task.registerTask('wp-cli-install-plugins', 'Install build plugins.', function(pluginsDir) {
		var pluginFiles = grunt.file.expand({filter: "isFile", cwd: pluginsDir}, ["*.zip"]);
		var plugins = [];
        for (var i = 0; i < pluginFiles.length; i++) {
			var plugin_file = pluginsDir + "/" + pluginFiles[i];
 			plugins.push([plugin_file,'--activate']);
        }		
		grunt.task.run(get_wp_cli_tasks_for_args('plugin','install',plugins));
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
		'prepare', [
			'less',
			'cssmin',
			'uglify'
		]
	);

    // Register tasks
    grunt.registerTask(
        'package', [
            'zip_directories'
        ]
    );

    // Register tasks
    grunt.registerTask(
        'install', [
            'prepare',
			'package'
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
			'wp-cli-dependencies',
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