var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');
var replace = require('rollup-plugin-replace');

module.exports = function (grunt) {
    grunt.initConfig({
        rollup: {
            layerSDK:{
                options: {
                    format: "amd",
                    plugins: [
                        nodeResolve({
                            jsnext: true,
                            main: true,
                            browser: true,
                        }),
                        commonjs(),
                        replace({
                            'process.env.NODE_ENV': JSON.stringify('production')
                        })
                    ]
                },
                files: [{
                    'dest': 'gen/layerSDK.js',
                    'src': 'src/layerSDK.js', // Only one source file is permitted
                }]

            },
            layerReact:{
                options: {
                    format: "amd",
                    plugins: [
                        nodeResolve({
                            jsnext: true,
                            main: true,
                            browser: true,
                        }),
                        commonjs(),
                        replace({
                            'process.env.NODE_ENV': JSON.stringify('production')
                        })
                    ]
                },
                files: [{
                    'dest': 'gen/layerReact.js',
                    'src': 'src/layerReact.js', // Only one source file is permitted
                }]

            }
        },
    });
    grunt.file.expand('../node_modules/grunt-*/tasks').forEach(grunt.loadTasks);
    grunt.registerTask('default', ['rollup:layerSDK','rollup:layerReact']);

};