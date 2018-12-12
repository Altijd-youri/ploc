# PLOC - PL/SQL code to doc converter

<!-- toc -->

- [Description](#description)
- [FAQ](#faq)
- [Installation](#installation)
- [Example for a single file](#example-for-a-single-file)
- [Example for multiple files](#example-for-multiple-files)
- [Automation with a file watcher](#automation-with-a-file-watcher)
- [Read more about npm scripts](#read-more-about-npm-scripts)

<!-- tocstop -->

## Description

PLOC is a simple PL/SQL code to doc converter which supports comments written in Markdown and generates Markdown files ready to use for your documentation. It is a npm package and therefore written in JavaScript. Simple means here really simple - the converter is only about 120 lines of commented code. Here a short demo package spec which demonstrates the idea behind PLOC:

~~~sql
CREATE OR REPLACE PACKAGE DEMO AUTHID current_user IS
c_demo_name CONSTANT VARCHAR2(30 CHAR) := 'A demo package for PLOC';
/**
PL/SQL Demo Package

You can use standard markdown here to describe your package, functions and procedures.

- This is a list entry
- A second one

[A link](https://daringfireball.net/projects/markdown/basics).
**/


FUNCTION to_zip (
  p_file_collection IN apex_t_export_files -- The file collection to process with APEX_ZIP.
) RETURN BLOB;
/**
Convert a file collection to a zip file.

EXAMPLE

```sql
DECLARE
  l_zip BLOB;
BEGIN
    l_zip := plex.to_zip(plex.backapp(
      p_app_id             => 100,
      p_include_object_ddl => true
    ));

  -- do something with the zip file...
END;
```
**/
~~~

- The converter picks up everything between the keywords PACKAGE, FUNCTION, PROCEDURE, TYPE or TRIGGER and a following PL/SQL multiline comment starting with `/**` and ending with `**/` (the double stars are used to support normal multiline comments)
- Anything else is ignored - if you want to include something in your docs, you have to provide a comment in the mentioned style after the relevant signature
- In the comments you can provide standard Markdown - anything what the target system (GitHub for example) can convert to valid HTML (we do not generate the HTML here, only the Markdown file)
- In the example above the constant `c_demo_name` is included in the docs - if you don't want this move the code behind the comment - you decide which globals are documented and which not
- There is no parameter parsing: the converter prints for each found item the following informations
  - A header (`# Package DEMO` or `## FUNCTION to_zip` in our example)
  - The comment content
  - A paragraph containing the word `SIGNATURE`
  - The signature of the PACKAGE, FUNCTION, PROCEDURE, TYPE or TRIGGER wrapped in a code block
  - Depending on the number of items (configurable) a TOC is generated in front of the document

Many words... Here the converted output of our example package:

~~~md
# PACKAGE DEMO

PL/SQL Demo Package

You can use standard markdown here to describe your package, functions and procedures.

- This is a list entry
- A second one

[A link](https://daringfireball.net/projects/markdown/basics).

SIGNATURE

```sql
CREATE OR REPLACE PACKAGE DEMO AUTHID current_user IS
c_demo_name CONSTANT VARCHAR2(30 CHAR) := 'A demo package for PLOC';
```

## FUNCTION to_zip

Convert a file collection to a zip file.

EXAMPLE

```sql
DECLARE
  l_zip BLOB;
BEGIN
    l_zip := plex.to_zip(plex.backapp(
      p_app_id             => 100,
      p_include_object_ddl => true
    ));

  -- do something with the zip file...
END;
```

SIGNATURE

```sql
FUNCTION to_zip (
  p_file_collection IN apex_t_export_files -- The file collection to process with APEX_ZIP.
) RETURN BLOB;
```
~~~

For a bigger example simply see the [PLEX project](https://github.com/ogobrecht/plex), which uses PLOC for the generation of the project README.md file:

- [The package source code](https://github.com/ogobrecht/plex/blob/master/PLEX.pks)
- [The README file rendered as HTML by GitHub](https://github.com/ogobrecht/plex)
- [The raw Markdown file generated by PLOC](https://raw.githubusercontent.com/ogobrecht/plex/master/README.md)


## FAQ

QUESTION: Why no Javadoc compatible parameter desriptions?

ANSWER: In my opinion this does NOT follow the DRY principle. PL/SQL is a strong typed language. Anything you need to know is visible in the signature. There is no need to repeat the parameters in a formal way only to comment a little bit. For short comments you can put single line comments direct after the parameters (see parameter `p_file_collection` in function `to_zip` in the example above). If you need to write more refer to the Markdown description in your comments. On long parameter lists you will more easily follow the single line comments direct after the parameters then looking around between the signature and the formal Javadoc comments.

QUESTION: Why do I need to put the comments below the signature?

ANSWER: If we put the comments before the signature the PL/SQL compiler will strip out the comment - at least for the comment of the package itself or a standalone function, procedure or trigger. If you then get the DDL of your objects out of the database with dbms_metadata you will lose these first comments. This will be no problem if you follow the files first approach together with a version control system but who knows in what ways your code will be inspected? It would be nice for the reviewers to get all provided comments.


## Installation

In your repo install ploc:

```js
npm install ploc
```


## Example for a single file

Add a new npm script entry in your package.json - here an example from my PLEX project - we call it `build:docs`:

```js
{
  "name": "plex",
  "scripts": {
    "build:docs": "npx ploc --in PLEX.pks --out README.md",
  },
  "dependencies": {
    "ploc": "^0.4.0"
  }
}
```

Notes:

- [npx](https://blog.npmjs.org/post/162869356040/introducing-npx-an-npm-package-runner) is a npm command to run locally installed packages with a command line interface and is available since npm 5.2.0
- ploc provides a cli
- We use only two of our possible three parameters: for the help run `npx ploc --help` or `npx ploc -h`

```bash
> npx ploc --help

Usage: ploc [options]

  -i, --in:    The glob pattern for the code files to read
               (default is "**/*.pks")

  -o, --out:   The pattern for the doc files to write
               (default is "{folder}{file}.md")
               {folder} = in file path with trailing directory separator
               {file} = in file name without extension

  -t, --toc:   How many items (methods including object/package name) the
               code must have before a toc is included
               (default is 4)

  -h, --help:  Command line help

Example 1: npx ploc --in **/*.pks --out {folder}{file}.md
Example 2: npx ploc --out docs/{file}.md
Example 3: npx ploc -i **/*.sql -o docs/{file}.md -t 5
```

Running the script:

```sh
npm run build:docs
```

The output will be something like this:

```sh
> plex@ build:docs /Users/ottmar/code/plex
> npx ploc --in PLEX.pks --out README.md

PLEX.pks => README.md
```

For each generated Markdown document you get one log entry with the input and output file - here we have only one entry: `PLEX.pks => README.md`


## Example for multiple files

We add now a script called `build:all_docs` to our package.json:

```js
{
  "name": "plex",
  "scripts": {
    "build:docs": "npx ploc --in PLEX.pks --out README.md",
    "build:all_docs": "npx ploc",
  },
  "dependencies": {
    "ploc": "^0.4.0"
  }
}
```

As you can see we omit simply all parameters and therefore the defaults are used (in = `**/*.pks`, 
out = `{folder}{file}.md`), which results in converting all found *.pks files in all directories and subdirectories. Here the output of this conversion:

```sh
> plex@ build:all_docs /Users/ottmar/code/plex
> npx ploc

PLEX.pks => PLEX.md
src/test_1.pks => src/test_1.md
src/test_2.pks => src/test_2.md
```

Obviously I have some test files in the `src` folder. You can also see on this example that you can use the variables `{folder}` (directory path of source file with trailing directory separator) and `{file}` (source file name without extension) in your `out` parameter. The `ìn` parameter is a standard [glob file pattern](https://github.com/isaacs/node-glob#glob).

One common use case is to place all docs in a docs folder - we change therefore our `build:all_docs` script:

```js
{
  "name": "plex",
  "scripts": {
    "build:docs": "npx ploc --in PLEX.pks --out README.md",
    "build:all_docs": "npx --out docs/{file}.md",
  },
  "dependencies": {
    "ploc": "^0.4.0"
  }
}
```

Note that the target directory `docs` must already exist - otherwise npm will throw an error. The resulting output should something like this:

```sh
> plex@ build:all_docs /Users/ottmar/code/plex
> npx --out docs/{file}.md

PLEX.pks => docs/PLEX.md
src/test_1.pks => docs/test_1.md
src/test_2.pks => docs/test_2.md
```


## Automation with a file watcher

We use here [chokidar](https://www.npmjs.com/package/chokidar-cli) - you can install it with `npm install chokidar-cli`. Then we create a watch script entry - here it is named `watch:docs`.

```js
{
  "name": "plex",
  "scripts": {
    "build:docs": "npx ploc --in PLEX.pks --out README.md",
    "watch:docs": "chokidar PLEX.pks package.json --initial -c \"npm run build:docs\""
  },
  "dependencies": {
    "chokidar-cli": "^1.2.1",
    "ploc": "^0.4.0"
  }
}
```

Notes:

- `chokidar PLEX.pks package.json` the files to watch (or glob patterns) are listed with a whitspace character as a separator
- `--initial` tells the watcher to run the script on start
- `-c \"npm run build:docs\""` is the command to run when one of the watched files changes - the escaped double quotes are important for windows

To start the watcher you run this:

```sh
npm run watch:docs
```

Here the output after the start:

```sh
> plex@ watch:docs /Users/ottmar/code/plex
> chokidar PLEX.pks package.json --initial -c "npm run build:docs"

add:PLEX.pks
add:package.json
Watching "PLEX.pks", "package.json" ..

> plex@ build:docs /Users/ottmar/code/plex
> npx ploc --in PLEX.pks --out README.md

PLEX.pks => README.md
```

The terminal is blocked because of the running watcher - after a file change you will see something like this:

```sh
change:PLEX.pks

> plex@ build:docs /Users/ottmar/code/plex
> npx ploc --in PLEX.pks --out README.md

PLEX.pks => README.md
```


## Read more about npm scripts

- https://medium.freecodecamp.org/introduction-to-npm-scripts-1dbb2ae01633
- https://medium.freecodecamp.org/why-i-left-gulp-and-grunt-for-npm-scripts-3d6853dd22b8
- https://css-tricks.com/why-npm-scripts/

