param(
  [string]$OutDir = "build"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $Radius * 2
  $path.AddArc($X, $Y, $d, $d, 180, 90)
  $path.AddArc($X + $Width - $d, $Y, $d, $d, 270, 90)
  $path.AddArc($X + $Width - $d, $Y + $Height - $d, $d, $d, 0, 90)
  $path.AddArc($X, $Y + $Height - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-ShieldPath {
  param([int]$Size)

  $s = $Size / 256.0
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $points = [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(139 * $s, 104 * $s),
    [System.Drawing.PointF]::new(170 * $s, 119 * $s),
    [System.Drawing.PointF]::new(176 * $s, 123 * $s),
    [System.Drawing.PointF]::new(176 * $s, 154 * $s),
    [System.Drawing.PointF]::new(166 * $s, 179 * $s),
    [System.Drawing.PointF]::new(140 * $s, 195 * $s),
    [System.Drawing.PointF]::new(112 * $s, 179 * $s),
    [System.Drawing.PointF]::new(102 * $s, 154 * $s),
    [System.Drawing.PointF]::new(102 * $s, 123 * $s),
    [System.Drawing.PointF]::new(108 * $s, 119 * $s)
  )
  $path.AddClosedCurve($points, 0.18)
  return $path
}

function New-IconBitmap {
  param([int]$Size)

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $s = $Size / 256.0
  $background = New-RoundedRectPath -X (18 * $s) -Y (18 * $s) -Width (220 * $s) -Height (220 * $s) -Radius (48 * $s)
  $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.PointF]::new(32 * $s, 16 * $s),
    [System.Drawing.PointF]::new(224 * $s, 240 * $s),
    [System.Drawing.Color]::FromArgb(255, 16, 38, 56),
    [System.Drawing.Color]::FromArgb(255, 7, 16, 23)
  )
  $graphics.FillPath($bgBrush, $background)

  $border = New-RoundedRectPath -X (28 * $s) -Y (28 * $s) -Width (200 * $s) -Height (200 * $s) -Radius (39 * $s)
  $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(48, 94, 196, 201), [Math]::Max(1.0, 4 * $s))
  $graphics.DrawPath($borderPen, $border)

  $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(24, 94, 196, 201))
  $graphics.FillEllipse($accentBrush, 146 * $s, 30 * $s, 76 * $s, 76 * $s)
  $accentBrush.Color = [System.Drawing.Color]::FromArgb(22, 131, 209, 139)
  $graphics.FillEllipse($accentBrush, 36 * $s, 154 * $s, 72 * $s, 72 * $s)

  $drivePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(245, 247, 250, 242), [Math]::Max(2.0, 16 * $s))
  $drivePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $drivePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $drivePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $drivePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $drivePath.AddLine(54 * $s, 130 * $s, 79 * $s, 75 * $s)
  $drivePath.AddLine(79 * $s, 75 * $s, 176 * $s, 75 * $s)
  $drivePath.AddLine(176 * $s, 75 * $s, 202 * $s, 130 * $s)
  $drivePath.AddLine(202 * $s, 130 * $s, 202 * $s, 177 * $s)
  $drivePath.AddLine(202 * $s, 177 * $s, 54 * $s, 177 * $s)
  $drivePath.CloseFigure()
  $graphics.DrawPath($drivePen, $drivePath)

  $separatorPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(235, 94, 196, 201), [Math]::Max(1.5, 9 * $s))
  $separatorPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $separatorPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($separatorPen, 53 * $s, 132 * $s, 203 * $s, 132 * $s)

  $dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 131, 209, 139))
  $dot = [Math]::Max(2.0, 9 * $s)
  $graphics.FillEllipse($dotBrush, 71 * $s, 154 * $s, $dot, $dot)
  $graphics.FillEllipse($dotBrush, 103 * $s, 154 * $s, $dot, $dot)

  $shield = New-ShieldPath -Size $Size
  $shieldFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(210, 8, 17, 26))
  $shieldPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(245, 247, 250, 242), [Math]::Max(2.0, 7 * $s))
  $shieldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.FillPath($shieldFill, $shield)
  $graphics.DrawPath($shieldPen, $shield)

  $checkPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 131, 209, 139), [Math]::Max(2.0, 8 * $s))
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLines($checkPen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(125 * $s, 154 * $s),
    [System.Drawing.PointF]::new(137 * $s, 166 * $s),
    [System.Drawing.PointF]::new(161 * $s, 137 * $s)
  ))

  $graphics.Dispose()
  return $bitmap
}

function Write-Ico {
  param(
    [string]$Path,
    [int[]]$Sizes
  )

  $pngs = @()
  foreach ($size in $Sizes) {
    $bitmap = New-IconBitmap -Size $size
    $stream = [System.IO.MemoryStream]::new()
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    $pngs += ,$stream.ToArray()
    $stream.Dispose()
  }

  $writer = [System.IO.BinaryWriter]::new([System.IO.File]::Open($Path, [System.IO.FileMode]::Create))
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]$Sizes.Count)

  $offset = 6 + (16 * $Sizes.Count)
  for ($i = 0; $i -lt $Sizes.Count; $i++) {
    $sizeByte = if ($Sizes[$i] -eq 256) { 0 } else { $Sizes[$i] }
    $writer.Write([byte]$sizeByte)
    $writer.Write([byte]$sizeByte)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]32)
    $writer.Write([UInt32]$pngs[$i].Length)
    $writer.Write([UInt32]$offset)
    $offset += $pngs[$i].Length
  }

  foreach ($png in $pngs) {
    $writer.Write($png)
  }
  $writer.Dispose()
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$sizes = @(16, 24, 32, 48, 64, 128, 256)
foreach ($size in $sizes) {
  $bitmap = New-IconBitmap -Size $size
  $bitmap.Save((Join-Path $OutDir "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
Write-Ico -Path (Join-Path $OutDir "icon.ico") -Sizes $sizes
