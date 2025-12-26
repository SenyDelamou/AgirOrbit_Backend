<#
Generates strong secrets for JWT_ACCESS_SECRET and OTP_SECRET.

Usage:
  .\generate-secrets.ps1            # prints secrets
  .\generate-secrets.ps1 -Write    # appends secrets to .env in the current folder
  .\generate-secrets.ps1 -Write -File "C:\path\to\.env"
#>

[CmdletBinding()]
Param(
    [switch]$Write,
    [string]$File = ".\.env"
)

function New-Secret([int]$length) {
    $bytes = New-Object 'System.Byte[]' $length
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

$jwt = New-Secret 48
$otp = New-Secret 32

$lines = @(
    "JWT_ACCESS_SECRET=\"$jwt\"",
    "OTP_SECRET=\"$otp\""
)

foreach ($l in $lines) { Write-Output $l }

if ($Write) {
    if (-not (Test-Path -Path $File)) { New-Item -Path $File -ItemType File -Force | Out-Null }
    Add-Content -Path $File -Value $lines
    Write-Output "`nWrote secrets to $File"
}
