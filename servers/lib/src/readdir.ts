import glob from 'glob';
// Get all files in directory
glob('src/*', (error, result) => {
    if (error) {
        console.log('Error', error);
    } 
    else {
        const dirFiles = { dirFiles: result };
        console.log(dirFiles);
    }
}
);