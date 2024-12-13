# @plotdb/quill-uploader

Upload Manager for Quill.js. It's a abstract interface for which you should still implement the upload function to handle the upload request.


## Installation

Install @plotdb/quill-uploader and its dependencies via npm:

    npm install --save @plotdb/quill-uploader ldfile @loadingio/debounce.js


## Usage

include js file:

    <script type="module" src="path/to/quill-uploader/dist/index.min.js"></script>


create a quill-uploader instance:

    uploadr = new quillUploader(opt)

where `opt` is an object with the following properties:

 - `upload`: a function that handles upload request.
   - request is handled  by accepting an object with following params:
       - `file`: file blob to upload which should provide following fields:
         - `name`, `size`, `type`, `lastModified`
       - `progress`: a callback function that accepts upload progress between 0 ~ 1.
   - it should return a Promise which resolves with an object with following fields:
     - `filename`: file name.
     - `size`: file size.
     - `modifiedtime`: last modified time of this file.
     - `url`: where we can find the uploaded version of this file.


then, use it to construct a Quill instance:

    new Quill(node, {
      modules: { toolbar: {
        handlers: {
          image: uploadr.handler.upload({type:"image"}),
          upload: uploadr.handler.upload({type:"file"})
        }
      }}
    })

and watch for `uploaded` event which will be fired with a file blob object when the file is successfully uploaded:

    uploader.on("uploaded", function(file) { ... });


## License

MIT
