#!/usr/bin/env bash
# Purpose: batch image resizer
# Source: https://guides.wp-bullet.com
# Author: Mike

# sudo apt-get install imagemagick

# absolute path to image folder
# e.g. /home/user/agama-mobile/public/images/cryptologo/
FOLDER=""

# max height
WIDTH=60

# max width
HEIGHT=60

#resize png or jpg to either height or width, keeps proportions using imagemagick
#find ${FOLDER} -iname '*.jpg' -o -iname '*.png' -exec convert \{} -verbose -resize $WIDTHx$HEIGHT\> \{} \;

#resize png to either height or width, keeps proportions using imagemagick
#find ${FOLDER} -iname '*.png' -exec convert \{} -verbose -resize $WIDTHx$HEIGHT\> \{} \;

#resize jpg only to either height or width, keeps proportions using imagemagick
find ${FOLDER} -iname '*.png' -exec convert \{} -verbose -resize $WIDTHx$HEIGHT\> \{} \;

# alternative
#mogrify -path ${FOLDER} -resize ${WIDTH}x${HEIGHT}% *.png -verbose