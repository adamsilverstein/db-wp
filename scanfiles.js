
var colors     = require( 'colors' );
var _          = require( 'underscore' );
var scanFolder = require( 'scan-folder' );
var db         = require( './data/db-in.js')
var fs         = require( 'file-system' );
var sloc       = require( 'sloc' );
const util     = require( 'util' );
var currentFolder = '';

const scanCodebase = function( codeRoot, wpVersion ) {
//	console.log( 'Scanning '.green + codeRoot.yellow + wpVersion.yellow );
	let toReturn = [],
		progress = '',
		hasExternal = [];

	toReturn['files'] = [];
	// Find js files in current dir.
	currentFolder = codeRoot;

	fs.recurseSync(
		codeRoot + wpVersion,
		null,
		function( filepath, relative, filename ) {

			progress += '.';
			// Is this a file?
			if ( filename ) {

				// What is the file extension?
				var splitname = filename.split( '.' )
					extension = splitname.pop(),
					preExtension = splitname.pop();

				if ( 'min' === preExtension || 'dev' === preExtension ) {
					return;
				}

				// Exclude themes
				if ( 0 === relative.indexOf( 'wp-content/themes/' ) ) {
					return;
				}

				// Externals libraries.
				var externals = [
					{
						'name': 'TinyMCE',
						'path': 'wp-includes/js/tinymce'
					},
					{
						'name': 'PLUpload',
						'path': 'wp-includes/js/plupload'
					},
					{
						'name': 'Scriptaculous',
						'path': 'wp-includes/js/scriptaculous'
					},
					{
						'name': 'Codepress',
						'path': 'wp-includes/js/codepress'
					},
					{
						'name': 'SWFUpload',
						'path': 'wp-includes/js/swfupload'
					},
					{
						'name': 'JCrop',
						'path': 'wp-includes/js/jcrop'
					},
					{
						'name': 'jQuery',
						'path': 'wp-includes/js/jquery'
					}
				];

				var skipExternal = false;
				_.each( externals, function( external ) {
					if ( 0 === relative.indexOf( external.path ) ) {

						// This is an external library, only add it once.
						if ( _.isUndefined( hasExternal[ external.path ] ) ) {
							hasExternal[ external.path ] = true;
							relative  = external.name;
							extension = 'external';
							return;
						} else {
							skipExternal = true;
						}
					}

				} );

				if ( skipExternal ) {
					return;
				}
				//console.log( 'adding ', extension, filename, toReturn['files'][ extension ] );
			}
		}
	);

	return toReturn;
}

let versionsRoot = '/Users/adamsilverstein/Sites/wordpresses/';
let versionData = [];

// Go thru each version.
_.each( db.wordpressVersions, function( wp ) {

	// For each version, scan the codebase.
	versionData[ wp.version ] = {
		'wordPressData': wp,
		'fileData':      scanCodebase( versionsRoot,  wp.folder )
	}
} );

//console.log( versionData );
var processedData = [];
// Process the versions, building stats.
_.each( db.wordpressVersions, function( wp ){

	let jsFiles     = versionData[ wp.version ].fileData.files.js,
		jsFileCount = jsFiles.length,
		totalJS     = 0;

	versionData[ wp.version ]['stats'] = [];

	_.each( jsFiles, function( jsFile ) {

		var code  = fs.readFileSync( jsFile.filepath, 'utf8' ),
			stats = sloc( code, 'js' );

		jsFile.source = stats.source;
		totalJS += stats.source;

	} );
	//	console.log( totalJS );

	versionData[ wp.version ]['stats']['jsFiles']     = _.pluck( jsFiles, 'relative' );
	versionData[ wp.version ]['stats']['jsFileCount'] = jsFileCount;
	versionData[ wp.version ]['stats']['totalJS']     = totalJS;

} );

_.each( db.wordpressVersions, function( wp ){
	console.log( wp.version.green, 'JS Files:'.red + versionData[ wp.version ]['stats']['totalJS'].blue )
} );
