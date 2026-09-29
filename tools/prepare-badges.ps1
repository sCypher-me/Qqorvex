param(
  [string]$SourceRoot = "C:\Users\Julio\Documents\badges",
  [string]$DestinationRoot = "apps\qqorvex\public\brand\badges"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourceRoot)) {
  throw "A pasta de origem dos badges não foi encontrada: $SourceRoot"
}

Add-Type -AssemblyName System.Drawing
$drawingAssembly = [System.Drawing.Bitmap].Assembly.Location
Add-Type -ReferencedAssemblies $drawingAssembly -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class BadgeCropper
{
    private static bool IsBackground(Color color)
    {
        return color.R >= 238 && color.G >= 238 && color.B >= 238;
    }

    private static void AddIfBackground(Bitmap source, int x, int y, int left, int top, bool[,] background, Queue<Point> queue)
    {
        if (x < 0 || y < 0 || x >= background.GetLength(0) || y >= background.GetLength(1) || background[x, y]) return;
        int sourceX = left + x;
        int sourceY = top + y;
        if (sourceX < 0 || sourceY < 0 || sourceX >= source.Width || sourceY >= source.Height)
            throw new InvalidOperationException("Coordenada fora do sprite: " + sourceX + "," + sourceY + " em " + source.Width + "x" + source.Height);
        if (!IsBackground(source.GetPixel(sourceX, sourceY))) return;
        background[x, y] = true;
        queue.Enqueue(new Point(x, y));
    }

    public static void Crop(string sourcePath, string destinationPath, int columns, int rows, int index)
    {
        using (var source = new Bitmap(sourcePath))
        {
            int cellWidth = source.Width / columns;
            int cellHeight = source.Height / rows;
            int column = 0;
            int row = 0;

            int zeroBased = Math.Max(1, index) - 1;
            column = zeroBased % columns;
            row = zeroBased / columns;

            int left = column * source.Width / columns;
            int top = row * source.Height / rows;
            int right = (column + 1) * source.Width / columns;
            int bottom = (row + 1) * source.Height / rows;
            int width = right - left;
            int height = bottom - top;
            var background = new bool[width, height];
            var queue = new Queue<Point>();

            for (int x = 0; x < width; x++)
            {
                AddIfBackground(source, x, 0, left, top, background, queue);
                AddIfBackground(source, x, height - 1, left, top, background, queue);
            }
            for (int y = 0; y < height; y++)
            {
                AddIfBackground(source, 0, y, left, top, background, queue);
                AddIfBackground(source, width - 1, y, left, top, background, queue);
            }

            int[] dx = { 1, -1, 0, 0 };
            int[] dy = { 0, 0, 1, -1 };
            while (queue.Count > 0)
            {
                Point current = queue.Dequeue();
                for (int direction = 0; direction < 4; direction++)
                {
                    AddIfBackground(source, current.X + dx[direction], current.Y + dy[direction], left, top, background, queue);
                }
            }

            int minX = width;
            int minY = height;
            int maxX = -1;
            int maxY = -1;
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    if (!background[x, y])
                    {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < 0 || maxY < 0) throw new InvalidOperationException("Nenhum desenho foi encontrado em " + sourcePath);

            const int padding = 10;
            minX = Math.Max(0, minX - padding);
            minY = Math.Max(0, minY - padding);
            maxX = Math.Min(width - 1, maxX + padding);
            maxY = Math.Min(height - 1, maxY + padding);
            int outputWidth = maxX - minX + 1;
            int outputHeight = maxY - minY + 1;

            using (var output = new Bitmap(outputWidth, outputHeight, PixelFormat.Format32bppArgb))
            {
                for (int y = minY; y <= maxY; y++)
                {
                    for (int x = minX; x <= maxX; x++)
                    {
                        Color color = source.GetPixel(left + x, top + y);
                        output.SetPixel(x - minX, y - minY, background[x, y] ? Color.FromArgb(0, color.R, color.G, color.B) : color);
                    }
                }
                output.Save(destinationPath, ImageFormat.Png);
            }
        }
    }
}
'@

$specialOutput = Join-Path $DestinationRoot "special"
$tenureOutput = Join-Path $DestinationRoot "tempo-assinatura"
New-Item -ItemType Directory -Force -Path $specialOutput, $tenureOutput | Out-Null

$specialBadges = @(
  @{ Source = Join-Path $SourceRoot "Amigos\Amigos.jpeg"; Destination = Join-Path $specialOutput "amigos-lifetime.png" },
  @{ Source = Join-Path $SourceRoot "betatester\betatester.jpeg"; Destination = Join-Path $specialOutput "beta-tester.png" },
  @{ Source = Join-Path $SourceRoot "Dono\Dono.jpeg"; Destination = Join-Path $specialOutput "dono.png" },
  @{ Source = Join-Path $SourceRoot "Limitados\Anual.jpeg"; Destination = Join-Path $specialOutput "anual.png" }
)

foreach ($badge in $specialBadges) {
  if (-not (Test-Path -LiteralPath $badge.Source)) { throw "Badge não encontrado: $($badge.Source)" }
  [BadgeCropper]::Crop($badge.Source, $badge.Destination, 1, 1, 1)
}

$tenureSources = @(
  @{ Start = 1; Source = Join-Path $SourceRoot "Tempoass\1 - 10.jpeg" },
  @{ Start = 11; Source = Join-Path $SourceRoot "Tempoass\11 - 20.jpeg" },
  @{ Start = 21; Source = Join-Path $SourceRoot "Tempoass\21 - 30.jpeg" },
  @{ Start = 31; Source = Join-Path $SourceRoot "Tempoass\31 - 40.jpeg" },
  @{ Start = 41; Source = Join-Path $SourceRoot "Tempoass\41 - 50.jpeg" }
)

foreach ($batch in $tenureSources) {
  if (-not (Test-Path -LiteralPath $batch.Source)) { throw "Sprite de tempo de assinatura não encontrado: $($batch.Source)" }
  for ($month = $batch.Start; $month -lt ($batch.Start + 10); $month++) {
    $destination = Join-Path $tenureOutput ("month-{0:D2}.png" -f $month)
    [BadgeCropper]::Crop($batch.Source, $destination, 5, 2, $month - $batch.Start + 1)
  }
}

Write-Output "Badges especiais gerados: $($specialBadges.Count)"
Write-Output "Badges de tempo de assinatura gerados: 50"
