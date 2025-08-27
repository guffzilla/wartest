# Warcraft 2 Tileset Extraction Helper
Write-Host "Warcraft 2 Tileset Extraction Helper" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

$war2DataPath = "C:\Users\garet\OneDrive\Desktop\newsite\War2Combat\War2Dat.mpq"
$outputDir = "C:\Users\garet\OneDrive\Desktop\newsite\backend\tiles"

Write-Host "Checking for War2Dat.mpq..." -ForegroundColor Yellow
if (Test-Path $war2DataPath) {
    Write-Host "✅ Found War2Dat.mpq" -ForegroundColor Green
    $size = [math]::Round((Get-Item $war2DataPath).Length / 1MB, 2)
    Write-Host "📁 Size: $size MB" -ForegroundColor Cyan
} else {
    Write-Host "❌ War2Dat.mpq not found at: $war2DataPath" -ForegroundColor Red
    Write-Host "Please check your War2Combat installation" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Download WinMPQ 1.64 from: https://forum.war2.ru/index.php?topic=961.0"
Write-Host "2. Download the Warcraft II BNE listfile from the same topic"
Write-Host "3. Open War2Dat.mpq with WinMPQ"
Write-Host "4. Add the listfile (Options -> File Lists -> Add)"
Write-Host "5. Extract .grp files to: $outputDir"
Write-Host ""
Write-Host "Opening extraction guide..." -ForegroundColor Green
Start-Process notepad "C:\Users\garet\OneDrive\Desktop\newsite\backend\tiles\EXTRACTION_GUIDE.md"
