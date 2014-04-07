#!/bin/bash
# pass in the name of the thing we're building
# mongo
# mongo-c-driver
# mongo-perl-driver
# mongo-php-driver

V="--verbose 0"
cov=/data/cov-sa/bin/cov
PACKAGE=$1
intDir=/data/INTS/$PACKAGE
srcDir=/data/src/$PACKAGE

rm -rf $intDir
rm -rf $srcDir

cd /data/downloads
wget http://github.com/mongodb/$PACKAGE/tarball/master
mv master $PACKAGE.nightly.tgz
cd /data/src
tar xvzf /data/downloads/$PACKAGE.nightly.tgz
mv mongodb-$PACKAGE-* $PACKAGE
cd $PACKAGE
# need to look up appropriate build command
# mongo          == scons all -j2
# mongo-c-driver == scons
# mongo-php-driver ==     (phpize ; ./configure ; make)
# mongo-java-driver == "ant compile"
case "$PACKAGE" in
"mongo")             buildCommand="scons all -j2"
         ;;
"mongo-c-driver")    buildCommand=scons
         ;;
"mongo-php-driver")  buildCommand=make
         phpize
         ./configure
         ;;
"mongo-perl-driver") buildCommand=make
         /usr/bin/perl Makefile.PL
         ;;
"mongo-java-driver") buildCommand="ant compile"
         ;;
"mongo-hadoop") buildCommand="./sbt package"
                     VERSION=1.1
         ;;
esac

$cov-build $V --dir $intDir $buildCommand

if [ -z $VERSION ]; then
case "$PACKAGE" in
  "mongo")             VERSION=`./mongod --version | head -1 | cut -d' ' -f 3 | cut -d',' -f1`
         ;;
  "mongo-c-driver")    VERSION=`find . -name conf.py | xargs grep 'version = ' | cut -d"'" -f2`
         ;;
  "mongo-php-driver")  VERSION=`grep MONGO_VERSION php_mongo.h | cut -d'"' -f2`
         ;;
  "mongo-perl-driver") VERSION=`grep 'our $VERSION' Makefile.PL | cut -d"'" -f2`
         ;;
  "mongo-java-driver") VERSION=`grep '^lib\.version=' build.properties | cut -d"=" -f2 | cut -d"-" -f1`
         ;;
  "mongo-hadoop-driver")  VERSION=`find . -name setup.py | xargs grep 'version=' | cut -d"'" -f2`  
         ;;
  esac
fi

$cov-build $V --dir $intDir $buildCommand
# $cov-analyze $V --dir $intDir --all --disable SECURE_CODING --disable UNINIT_CTOR --disable UNCAUGHT_EXCEPT --parse-warnings-config ~/parse_warnings.conf --enable-constraint-fpp --enable-single-virtual --enable-fnptr -j 2 --enable-callgraph-metrics -co STACK_USE:max_single_base_use_bytes:2048 -co STACK_USE:max_total_use_bytes:16000 -co STACK_USE:note_max_use:true -co CHECKED_RETURN:stat_threshold:50 -co NULL_RETURNS:stat_threshold:50 -co DEADCODE:no_dead_default:true -co DEADCODE:report_redundant_tests:true 
$cov-analyze $V --dir $intDir --all --disable SECURE_CODING --disable UNINIT_CTOR --disable UNCAUGHT_EXCEPT --disable STACK_USE --parse-warnings-config ~/parse_warnings.conf --enable-constraint-fpp --enable-single-virtual --enable-fnptr -j 2 --enable-callgraph-metrics -co CHECKED_RETURN:stat_threshold:50 -co NULL_RETURNS:stat_threshold:50 -co DEADCODE:no_dead_default:true -co DEADCODE:report_redundant_tests:true 
if [ $? -gt 0 ]; then
    rm -rf $intDir/c
    $cov-analyze-java $V --dir $intDir --all -j 2
fi

build=nightly
covVersion=`$cov-build --ident | head -1 | cut -d" " -f 5`

if [ "$PACKAGE" == "mongo" ]; then
    CVA=" --cva "
fi

$cov-commit-defects $V --dir $intDir --host cov1.bci.10gen.cc --port 8080 --user usernamehere --password passwordhere --stream $PACKAGE --description "$build-$covVersion-$VERSION" --version "$VERSION " --target linux64 --strip-path $srcDir
