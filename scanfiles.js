
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


				toReturn['files'][ extension ] = toReturn['files'][ extension ] || [];

				if ( 'external' === extension ) {
					toReturn['files'][ extension ].push( relative );
				} else {
					toReturn['files'][ extension ].push( {
						'filepath': filepath,
						'relative': relative,
						'filename': filename
					} );
				}
				//console.log( 'adding ', extension, filename, toReturn['files'][ extension ] );
			}
		}
	);

	return toReturn;
}

let versionsRoot = '/Users/adamsilverstein/Sites/wordpresses/';
let versionData = [];

console.log( 'Starting'.green );

// Go thru each version.
_.each( db.wordpressVersions, function( wp ) {

	// For each version, scan the codebase.
	versionData[ wp.version ] = {
		'wordPressData': wp,
		'fileData':      scanCodebase( versionsRoot,  wp.folder )
	}
} );

console.log( 'Processing'.yellow );
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

	versionData[ wp.version ]['stats']['jsFiles']     = _.pluck( jsFiles, 'filename' );
	versionData[ wp.version ]['stats']['jsFileCount'] = jsFileCount;
	versionData[ wp.version ]['stats']['totalJS']     = totalJS;
	versionData[ wp.version ]['stats']['external']    = versionData[ wp.version ].fileData.files.external;

} );

var currentJS        = [];
var currentExternals = [];
_.each( db.wordpressVersions, function( wp ){
	var newJS       = _.difference( versionData[ wp.version ]['stats']['jsFiles'], currentJS );
	var newExternal = _.difference( versionData[ wp.version ]['stats']['external'], currentExternals );
	currentJS        = versionData[ wp.version ]['stats']['jsFiles'];
	currentExternals = versionData[ wp.version ]['stats']['external'];
	versionData[ wp.version ]['stats']['newJs']    = newJS;
	versionData[ wp.version ]['stats']['external'] = newExternal;
} );

allData = [];
console.log( 'Writing markup'.yellow );

var markup = '<html><head><link rel="stylesheet" href="css/reveal.css"><link rel="stylesheet" href="css/theme/white.css"></head><body><div class="reveal"><div class="slides">';

_.each( db.wordpressVersions, function( wp ){

	markup += '<section>';
	markup += '<h3>Version ' + wp.version +' ' +  wp.released +' '+ '</h3>';
	markup += '<h4>' + '' + versionData[ wp.version ]['stats']['totalJS'] + ' lines of JavaScript</h4>';
	if ( ! _.isUndefined( versionData[ wp.version ]['stats']['newJs'] ) && ! _.isEmpty( versionData[ wp.version ]['stats']['newJs'] ) ) {
		markup += '<p>' + '<i>' + versionData[ wp.version ]['stats']['newJs'].join( ', ' ) + '</i></p>';

	}
	markup += '</section>'

} );
markup += '</div><script src="js/reveal.js"></script><script>Reveal.initialize();</script></body></html>';
fs.writeFile( './jsdata.json', JSON.stringify( allData, null, 4 ) );
fs.writeFile( './slides.html', markup );
console.log( 'Done.'.green );
