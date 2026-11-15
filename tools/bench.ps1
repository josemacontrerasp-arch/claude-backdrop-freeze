# Shows pictures behind the chat in the Claude desktop app through a mod's bench hook (see bench-hook.md), one after
# another, and measures how much processor time each of the app's processes uses while each is up.
# Nothing is captured from the screen. Windows only. The app's window must be visible the whole time.
#
#   .\bench.ps1 -Mod C:\path\to\your-mod -Steps off, "file:C:\path\one.svg", "file:C:\path\two.svg"
#
# A step is: off | file:<path to an svg> | any scene name your hook understands.
# Read the column of the app's main renderer: it is the renderer process with by far the most memory.
param(
    [Parameter(Mandatory)][string]$Mod,
    [Parameter(Mandatory)][string[]]$Steps,
    [double]$Settle = 3,
    [double]$Measure = 5
)

$bench = Join-Path $Mod 'bench'
New-Item -ItemType Directory -Force $bench | Out-Null

# The app's own processes, labelled once by what their command line says they are.
$label = @{}
$app = Get-CimInstance Win32_Process -Filter "Name='claude.exe'" | Where-Object { $_.ExecutablePath -match '\\app\\claude\.exe$' }
foreach ($process in $app) {
    $type = if ($process.CommandLine -match '--type=([a-z-]+)') { $Matches[1] } else { 'main' }
    if ($process.CommandLine -match '--renderer-client-id=(\d+)') { $type = "r$($Matches[1])" }
    if ($type -eq 'gpu-process') { $type = 'gpu' }
    $label[[int]$process.ProcessId] = $type
}
if ($label.Count -eq 0) { throw 'The Claude desktop app does not seem to be running.' }

function Get-Times {
    $times = @{}
    foreach ($id in @($label.Keys)) {
        $process = Get-Process -Id $id -ErrorAction SilentlyContinue
        if ($process) { $times[$id] = $process.TotalProcessorTime.TotalSeconds }
    }
    $times
}

$watch = @($label.Keys | Where-Object { $label[$_] -match '^(gpu|r\d+|main)$' } | Sort-Object { $label[$_] })
$id = [int]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() % 100000000)

foreach ($step in $Steps) {
    $id += 1
    $what = $step
    if ($step -like 'file:*') {
        Copy-Item -LiteralPath $step.Substring(5) -Destination (Join-Path $bench 'scene.svg') -Force
        $what = 'file'
    }
    Set-Content -LiteralPath (Join-Path $bench 'order.txt') -Value "$id $what" -Encoding ascii -NoNewline

    # The hook answers in ack.txt once it has shown the picture.
    $ack = ''
    $deadline = (Get-Date).AddSeconds(8)
    while ((Get-Date) -lt $deadline) {
        $ack = Get-Content -LiteralPath (Join-Path $bench 'ack.txt') -Raw -ErrorAction SilentlyContinue
        if ($ack -and $ack.StartsWith("$id ")) { break }
        Start-Sleep -Milliseconds 150
    }
    $name = if ($step -like 'file:*') { Split-Path $step.Substring(5) -Leaf } else { $step }
    if (-not ($ack -and $ack.StartsWith("$id "))) {
        '{0,-30} NO ANSWER FROM THE MOD' -f $name
        continue
    }

    Start-Sleep -Milliseconds ([int]($Settle * 1000))
    $before = Get-Times
    $clock = [Diagnostics.Stopwatch]::StartNew()
    Start-Sleep -Milliseconds ([int]($Measure * 1000))
    $after = Get-Times
    $seconds = $clock.Elapsed.TotalSeconds
    $cells = foreach ($process in $watch) {
        if ($before.ContainsKey($process) -and $after.ContainsKey($process)) {
            '{0} {1,5:N1}' -f $label[$process], (100 * ($after[$process] - $before[$process]) / $seconds)
        }
    }
    '{0,-30} {1,-9} | {2}' -f $name, ($ack -split ' ')[2], ($cells -join '  ')
}
