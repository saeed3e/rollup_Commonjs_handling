var nodeResolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');
var replace = require('rollup-plugin-replace');

module.exports = function (grunt) {
    grunt.initConfig({
        rollup: {
            options: {
                moduleName: "specs",
                format: "iife",
                plugins: [
                    nodeResolve({
                        jsnext: true,
                        main: true,
                        browser: true,
                    }),
                    commonjs(),
                ]
            },
            files: {
                'dest': 'gen/gBundle.js',
                'src': 'src/index.js', // Only one source file is permitted
            }
        },
    });
    grunt.file.expand('../node_modules/grunt-*/tasks').forEach(grunt.loadTasks);
    grunt.registerTask('default', ['rollup']);

};