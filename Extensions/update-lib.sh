
echo "Removing and replacing directories (Lib: ./ExtensionMenus, ./TestRunner)"
rm --dir --recursive ./ExtensionMenus/Lib
rm --dir --recursive ./TestRunner/Lib
cp -r ./Lib ./ExtensionMenus/Lib
cp -r ./Lib ./TestRunner/Lib

