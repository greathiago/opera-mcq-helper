# build.ps1
# Correctly packages only the necessary extension files into a zip.

param(
    [string]$SourcePath = (Split-Path -Parent $MyInvocation.MyCommand.Path),
    [string]$DestinationName = "opera-mcq-helper-dist.zip"
)

$zipPath = Join-Path $SourcePath $DestinationName

# List of files essential for the extension to run
$filesToPackage = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js"
)

# Create a temporary directory to stage the files
$tempDir = Join-Path $SourcePath "temp_package"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -Path $tempDir -ItemType Directory | Out-Null

# Copy the necessary files to the temp directory
foreach ($file in $filesToPackage) {
    Copy-Item (Join-Path $SourcePath $file) (Join-Path $tempDir $file)
}

# Remove the old zip file if it exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "Creating package at: $zipPath"

# Create the zip from the temporary directory
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath)

# Clean up the temporary directory
Remove-Item -Recurse -Force $tempDir

Write-Host "Extension successfully packaged."
