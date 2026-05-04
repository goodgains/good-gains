#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Media;
using System.Xml.Serialization;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.Gui.Tools;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.DrawingTools;
using SharpDX;
using DxBrush = SharpDX.Direct2D1.SolidColorBrush;
using WpfColor = System.Windows.Media.Color;
#endregion

namespace NinjaTrader.NinjaScript.Indicators
{
    public class GGSmiPrecision : Indicator
    {
        private const string ProductDisplayName = "GG SMI Precision";
        private const string LocalLicenseServerUrl = "http://127.0.0.1:3000/api/verify-license";
        private const string ProductionLicenseServerUrl = "https://goodgainsindicators.com/api/verify-license";
        private const string EmptyLicenseMessage = "Enter License Key";
        private const string InvalidLicenseMessage = "Invalid License";
        private const int LicenseRequestTimeoutMs = 15000;
        private const int LicenseRetryIntervalSeconds = 15;
        private const string LicenseWarningTag = "GGSMIPRECISION_LICENSE_WARNING";
        private const string SavedLicenseKeyFileName = "GGSMIPrecision.key";

        private Series<double> relativeRangeSeries;
        private Series<double> rangeSeries;
        private EMA emaRelative1;
        private EMA emaRelative2;
        private EMA emaRange1;
        private EMA emaRange2;
        private EMA signalEma;

        private static readonly BrushConverter BrushConverter = new BrushConverter();
        private bool licenseValidated;
        private bool licenseIsValid;
        private bool lastValidatedUseLocalLicenseServer;
        private string licenseStatusMessage;
        private string lastValidatedLicenseKey;
        private string lastValidatedMachineId;
        private DateTime lastLicenseValidationAttemptUtc;

        [NinjaScriptProperty]
        [Range(1, 15000)]
        [Display(Name = "%K Length", Order = 1, GroupName = "Parameters")]
        public int LengthK { get; set; }

        [NinjaScriptProperty]
        [Range(1, 4999)]
        [Display(Name = "%D Length", Order = 2, GroupName = "Parameters")]
        public int LengthD { get; set; }

        [NinjaScriptProperty]
        [Range(1, 4999)]
        [Display(Name = "EMA Length", Order = 3, GroupName = "Parameters")]
        public int LengthEMA { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Overbought", Order = 1, GroupName = "Levels")]
        public double Overbought { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Oversold", Order = 2, GroupName = "Levels")]
        public double Oversold { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Middle Line", Order = 3, GroupName = "Levels")]
        public bool ShowMiddleLine { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "License Key", Order = 1, GroupName = "License")]
        public string LicenseKey { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Use Local License Server", Order = 2, GroupName = "License")]
        public bool UseLocalLicenseServer { get; set; }

        public override string DisplayName
        {
            get { return ProductDisplayName; }
        }

        [XmlIgnore]
        [Display(Name = "SMI Line Color", Order = 1, GroupName = "Colors")]
        public Brush SmiBrush { get; set; }

        [Browsable(false)]
        public string SmiBrushSerializable
        {
            get { return BrushToString(SmiBrush); }
            set { SmiBrush = StringToBrush(value, Brushes.Blue); }
        }

        [XmlIgnore]
        [Display(Name = "Signal Line Color", Order = 2, GroupName = "Colors")]
        public Brush SignalBrush { get; set; }

        [Browsable(false)]
        public string SignalBrushSerializable
        {
            get { return BrushToString(SignalBrush); }
            set { SignalBrush = StringToBrush(value, Brushes.Yellow); }
        }

        [XmlIgnore]
        [Display(Name = "Overbought Line Color", Order = 3, GroupName = "Colors")]
        public Brush OverboughtLineBrush { get; set; }

        [Browsable(false)]
        public string OverboughtLineBrushSerializable
        {
            get { return BrushToString(OverboughtLineBrush); }
            set { OverboughtLineBrush = StringToBrush(value, Brushes.Green); }
        }

        [XmlIgnore]
        [Display(Name = "Oversold Line Color", Order = 4, GroupName = "Colors")]
        public Brush OversoldLineBrush { get; set; }

        [Browsable(false)]
        public string OversoldLineBrushSerializable
        {
            get { return BrushToString(OversoldLineBrush); }
            set { OversoldLineBrush = StringToBrush(value, Brushes.Red); }
        }

        [XmlIgnore]
        [Display(Name = "Middle Line Color", Order = 5, GroupName = "Colors")]
        public Brush MiddleLineBrush { get; set; }

        [Browsable(false)]
        public string MiddleLineBrushSerializable
        {
            get { return BrushToString(MiddleLineBrush); }
            set { MiddleLineBrush = StringToBrush(value, Brushes.Gray); }
        }

        [XmlIgnore]
        [Display(Name = "Overbought Fill Color", Order = 6, GroupName = "Colors")]
        public Brush OverboughtFillBrush { get; set; }

        [Browsable(false)]
        public string OverboughtFillBrushSerializable
        {
            get { return BrushToString(OverboughtFillBrush); }
            set { OverboughtFillBrush = StringToBrush(value, new SolidColorBrush(WpfColor.FromArgb(87, 0, 128, 0))); }
        }

        [XmlIgnore]
        [Display(Name = "Oversold Fill Color", Order = 7, GroupName = "Colors")]
        public Brush OversoldFillBrush { get; set; }

        [Browsable(false)]
        public string OversoldFillBrushSerializable
        {
            get { return BrushToString(OversoldFillBrush); }
            set { OversoldFillBrush = StringToBrush(value, new SolidColorBrush(WpfColor.FromArgb(87, 255, 0, 0))); }
        }

        [Browsable(false)]
        [XmlIgnore]
        public Series<double> SMI
        {
            get { return Values[0]; }
        }

        [Browsable(false)]
        [XmlIgnore]
        public Series<double> Signal
        {
            get { return Values[1]; }
        }

        [Browsable(false)]
        [XmlIgnore]
        public Series<double> OverboughtLineSeries
        {
            get { return Values[2]; }
        }

        [Browsable(false)]
        [XmlIgnore]
        public Series<double> OversoldLineSeries
        {
            get { return Values[3]; }
        }

        [Browsable(false)]
        [XmlIgnore]
        public Series<double> MiddleLineSeries
        {
            get { return Values[4]; }
        }

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = ProductDisplayName;
                Description = "Minimal Stochastic Momentum Index.";
                Calculate = Calculate.OnBarClose;
                IsOverlay = false;
                DisplayInDataBox = true;
                DrawOnPricePanel = false;
                PaintPriceMarkers = true;
                ScaleJustification = ScaleJustification.Right;
                IsSuspendedWhileInactive = false;

                LengthK = 10;
                LengthD = 3;
                LengthEMA = 3;
                Overbought = 40;
                Oversold = -40;
                ShowMiddleLine = true;

                SmiBrush = FreezeBrush(Brushes.Blue);
                SignalBrush = FreezeBrush(Brushes.Yellow);
                OverboughtLineBrush = FreezeBrush(Brushes.Green);
                OversoldLineBrush = FreezeBrush(Brushes.Red);
                MiddleLineBrush = FreezeBrush(Brushes.Gray);
                OverboughtFillBrush = FreezeBrush(new SolidColorBrush(WpfColor.FromArgb(87, 0, 128, 0)));
                OversoldFillBrush = FreezeBrush(new SolidColorBrush(WpfColor.FromArgb(87, 255, 0, 0)));
                LicenseKey = string.Empty;
                UseLocalLicenseServer = false;
                licenseValidated = false;
                licenseIsValid = false;
                licenseStatusMessage = string.Empty;
                lastValidatedLicenseKey = string.Empty;
                lastValidatedMachineId = string.Empty;
                lastLicenseValidationAttemptUtc = DateTime.MinValue;
                lastValidatedUseLocalLicenseServer = UseLocalLicenseServer;

                AddPlot(Brushes.Blue, "SMI");
                AddPlot(Brushes.Yellow, "Signal");
                AddPlot(Brushes.Green, "OverboughtLine");
                AddPlot(Brushes.Red, "OversoldLine");
                AddPlot(Brushes.Gray, "MiddleLine");
            }
            else if (State == State.DataLoaded)
            {
                FreezeBrushSettings();

                relativeRangeSeries = new Series<double>(this);
                rangeSeries = new Series<double>(this);

                emaRelative1 = EMA(relativeRangeSeries, LengthD);
                emaRelative2 = EMA(emaRelative1, LengthD);
                emaRange1 = EMA(rangeSeries, LengthD);
                emaRange2 = EMA(emaRange1, LengthD);
                signalEma = EMA(SMI, LengthEMA);

                Plots[0].PlotStyle = PlotStyle.Line;
                Plots[1].PlotStyle = PlotStyle.Line;
                Plots[2].PlotStyle = PlotStyle.Line;
                Plots[3].PlotStyle = PlotStyle.Line;
                Plots[4].PlotStyle = PlotStyle.Line;
                ValidateLicenseStatus();
            }
            else if (State == State.Configure)
            {
                FreezeBrushSettings();
                ValidateLicenseStatus();
            }
            else if (State == State.Historical)
            {
                ValidateLicenseStatus();
            }
        }

        protected override void OnBarUpdate()
        {
            ValidateLicenseStatus();
            if (!licenseIsValid)
            {
                SMI[0] = double.NaN;
                Signal[0] = double.NaN;
                OverboughtLineSeries[0] = double.NaN;
                OversoldLineSeries[0] = double.NaN;
                MiddleLineSeries[0] = double.NaN;
                Draw.TextFixed(
                    this,
                    LicenseWarningTag,
                    string.IsNullOrWhiteSpace(licenseStatusMessage) ? InvalidLicenseMessage : licenseStatusMessage,
                    TextPosition.TopLeft,
                    Brushes.OrangeRed,
                    new SimpleFont("Segoe UI", 12),
                    Brushes.Transparent,
                    Brushes.Transparent,
                    0);
                return;
            }

            RemoveDrawObject(LicenseWarningTag);

            OverboughtLineSeries[0] = Overbought;
            OversoldLineSeries[0] = Oversold;
            MiddleLineSeries[0] = ShowMiddleLine ? 0 : double.NaN;

            PlotBrushes[0][0] = SmiBrush;
            PlotBrushes[1][0] = SignalBrush;
            PlotBrushes[2][0] = OverboughtLineBrush;
            PlotBrushes[3][0] = OversoldLineBrush;
            PlotBrushes[4][0] = MiddleLineBrush;

            if (CurrentBar < Math.Max(LengthK, LengthEMA))
            {
                SMI[0] = 0;
                Signal[0] = 0;
                return;
            }

            double highestHigh = MAX(High, LengthK)[0];
            double lowestLow = MIN(Low, LengthK)[0];
            double range = highestHigh - lowestLow;
            double relativeRange = Close[0] - ((highestHigh + lowestLow) / 2.0);

            relativeRangeSeries[0] = relativeRange;
            rangeSeries[0] = range;

            double denominator = emaRange2[0];
            double smiValue = 0.0;

            if (Math.Abs(denominator) > 0.0000001)
                smiValue = 200.0 * (emaRelative2[0] / denominator);

            SMI[0] = smiValue;
            Signal[0] = signalEma[0];
        }

        protected override void OnRender(ChartControl chartControl, ChartScale chartScale)
        {
            base.OnRender(chartControl, chartScale);

            if (!licenseIsValid || ChartBars == null || Bars == null || RenderTarget == null || CurrentBar < LengthK)
                return;

            int startBar = ChartBars.FromIndex;
            int endBar = ChartBars.ToIndex;

            using (var overboughtBrush = new DxBrush(RenderTarget, ToDxColor4(OverboughtFillBrush, new Color4(0f, 0.5f, 0f, 0.34f))))
            using (var oversoldBrush = new DxBrush(RenderTarget, ToDxColor4(OversoldFillBrush, new Color4(1f, 0f, 0f, 0.34f))))
            {
                for (int barIndex = startBar; barIndex <= endBar; barIndex++)
                {
                    if (barIndex < 0 || barIndex > CurrentBar)
                        continue;

                    double smiValue = SMI.GetValueAt(barIndex);
                    double signalValue = Signal.GetValueAt(barIndex);
                    float x = chartControl.GetXByBarIndex(ChartBars, barIndex);

                    if (signalValue > Overbought)
                    {
                        double topValue = smiValue > Overbought
                            ? Math.Min(smiValue, signalValue)
                            : signalValue;

                        float levelY = chartScale.GetYByValue(Overbought);
                        float topY = chartScale.GetYByValue(topValue);

                        RenderTarget.DrawLine(
                            new Vector2(x, levelY),
                            new Vector2(x, topY),
                            overboughtBrush,
                            1.0f
                        );
                    }
                    else if (signalValue < Oversold)
                    {
                        double bottomValue = smiValue < Oversold
                            ? Math.Max(smiValue, signalValue)
                            : signalValue;

                        float levelY = chartScale.GetYByValue(Oversold);
                        float bottomY = chartScale.GetYByValue(bottomValue);

                        RenderTarget.DrawLine(
                            new Vector2(x, levelY),
                            new Vector2(x, bottomY),
                            oversoldBrush,
                            1.0f
                        );
                    }
                }
            }
        }

        private static Brush FreezeBrush(Brush brush)
        {
            if (brush == null)
                return null;

            try
            {
                if (brush.CanFreeze && !brush.IsFrozen)
                    brush.Freeze();
            }
            catch
            {
            }

            return brush;
        }

        private void FreezeBrushSettings()
        {
            SmiBrush = FreezeBrush(SmiBrush);
            SignalBrush = FreezeBrush(SignalBrush);
            OverboughtLineBrush = FreezeBrush(OverboughtLineBrush);
            OversoldLineBrush = FreezeBrush(OversoldLineBrush);
            MiddleLineBrush = FreezeBrush(MiddleLineBrush);
            OverboughtFillBrush = FreezeBrush(OverboughtFillBrush);
            OversoldFillBrush = FreezeBrush(OversoldFillBrush);
        }

        private static string BrushToString(Brush brush)
        {
            if (brush == null)
                return string.Empty;

            try
            {
                return BrushConverter.ConvertToInvariantString(brush);
            }
            catch
            {
                return string.Empty;
            }
        }

        private static Brush StringToBrush(string value, Brush fallback)
        {
            if (string.IsNullOrWhiteSpace(value))
                return FreezeBrush(fallback);

            try
            {
                object converted = BrushConverter.ConvertFromString(null, CultureInfo.InvariantCulture, value);
                Brush brush = converted as Brush;
                return FreezeBrush(brush ?? fallback);
            }
            catch
            {
                return FreezeBrush(fallback);
            }
        }

        private Color4 ToDxColor4(Brush brush, Color4 fallback)
        {
            SolidColorBrush solidBrush = brush as SolidColorBrush;
            if (solidBrush == null)
                return fallback;

            WpfColor color = solidBrush.Color;
            return new Color4(
                color.R / 255f,
                color.G / 255f,
                color.B / 255f,
                color.A / 255f
            );
        }

        private string NormalizeLicenseKey(string value)
        {
            return (value ?? string.Empty).Trim().ToUpperInvariant();
        }

        private string GetLicenseServerUrl()
        {
            return UseLocalLicenseServer ? LocalLicenseServerUrl : ProductionLicenseServerUrl;
        }

        private string EscapeJsonValue(string value)
        {
            if (string.IsNullOrEmpty(value))
                return string.Empty;

            return value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\r", "\\r")
                .Replace("\n", "\\n");
        }

        private string GetMachineId()
        {
            try
            {
                string rawMachineIdentity = string.Join("|",
                    Environment.MachineName ?? string.Empty,
                    Environment.UserDomainName ?? string.Empty,
                    Environment.ProcessorCount.ToString(CultureInfo.InvariantCulture),
                    Environment.Is64BitOperatingSystem ? "x64" : "x86");

                using (SHA256 sha = SHA256.Create())
                {
                    byte[] hashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(rawMachineIdentity));
                    StringBuilder builder = new StringBuilder(hashBytes.Length * 2);

                    foreach (byte hashByte in hashBytes)
                        builder.Append(hashByte.ToString("x2", CultureInfo.InvariantCulture));

                    return builder.ToString();
                }
            }
            catch
            {
                return string.Empty;
            }
        }

        private string GetLicenseCacheKey(string normalizedLicenseKey, string machineId)
        {
            try
            {
                string rawCacheKey = ProductDisplayName + "|" + normalizedLicenseKey + "|" + machineId;

                using (SHA256 sha = SHA256.Create())
                {
                    byte[] hashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(rawCacheKey));
                    StringBuilder builder = new StringBuilder(hashBytes.Length * 2);

                    foreach (byte hashByte in hashBytes)
                        builder.Append(hashByte.ToString("x2", CultureInfo.InvariantCulture));

                    return builder.ToString();
                }
            }
            catch
            {
                return string.Empty;
            }
        }

        private string GetLicenseCachePath(string normalizedLicenseKey, string machineId)
        {
            string cacheKey = GetLicenseCacheKey(normalizedLicenseKey, machineId);
            if (string.IsNullOrWhiteSpace(cacheKey))
                return string.Empty;

            string cacheDirectory = GetLicenseCacheDirectory();
            if (string.IsNullOrWhiteSpace(cacheDirectory))
                return string.Empty;

            return Path.Combine(cacheDirectory, "GGSMIPrecision-" + cacheKey + ".license");
        }

        private string GetLicenseCacheDirectory()
        {
            try
            {
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "GoodGainsIndicators",
                    "LicenseCache");
            }
            catch
            {
                return string.Empty;
            }
        }

        private string GetSavedLicenseKeyPath()
        {
            string cacheDirectory = GetLicenseCacheDirectory();
            return string.IsNullOrWhiteSpace(cacheDirectory)
                ? string.Empty
                : Path.Combine(cacheDirectory, SavedLicenseKeyFileName);
        }

        private string TryLoadSavedLicenseKey()
        {
            try
            {
                string savedLicenseKeyPath = GetSavedLicenseKeyPath();
                if (string.IsNullOrWhiteSpace(savedLicenseKeyPath) || !File.Exists(savedLicenseKeyPath))
                    return string.Empty;

                return NormalizeLicenseKey(File.ReadAllText(savedLicenseKeyPath));
            }
            catch
            {
                return string.Empty;
            }
        }

        private void SaveLastValidLicenseKey(string normalizedLicenseKey)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(normalizedLicenseKey))
                    return;

                string savedLicenseKeyPath = GetSavedLicenseKeyPath();
                if (string.IsNullOrWhiteSpace(savedLicenseKeyPath))
                    return;

                string cacheDirectory = Path.GetDirectoryName(savedLicenseKeyPath);
                if (!string.IsNullOrWhiteSpace(cacheDirectory))
                    Directory.CreateDirectory(cacheDirectory);

                File.WriteAllText(savedLicenseKeyPath, normalizedLicenseKey);
            }
            catch
            {
            }
        }

        private bool TryUseCachedLicense(string normalizedLicenseKey, string machineId)
        {
            try
            {
                string cachePath = GetLicenseCachePath(normalizedLicenseKey, machineId);
                if (string.IsNullOrWhiteSpace(cachePath) || !File.Exists(cachePath))
                    return false;

                string cachedLicenseKey = File.ReadAllText(cachePath).Trim();
                return string.Equals(cachedLicenseKey, normalizedLicenseKey, StringComparison.Ordinal);
            }
            catch
            {
                return false;
            }
        }

        private void SaveCachedLicense(string normalizedLicenseKey, string machineId)
        {
            try
            {
                string cachePath = GetLicenseCachePath(normalizedLicenseKey, machineId);
                if (string.IsNullOrWhiteSpace(cachePath))
                    return;

                string cacheDirectory = Path.GetDirectoryName(cachePath);
                if (!string.IsNullOrWhiteSpace(cacheDirectory))
                    Directory.CreateDirectory(cacheDirectory);

                File.WriteAllText(cachePath, normalizedLicenseKey);
            }
            catch
            {
            }
        }

        private string ExtractResponseMessage(string responseText)
        {
            if (string.IsNullOrWhiteSpace(responseText))
                return string.Empty;

            const string propertyName = "\"message\"";
            int propertyIndex = responseText.IndexOf(propertyName, StringComparison.OrdinalIgnoreCase);
            if (propertyIndex < 0)
                return string.Empty;

            int colonIndex = responseText.IndexOf(':', propertyIndex + propertyName.Length);
            if (colonIndex < 0)
                return string.Empty;

            int valueStartIndex = responseText.IndexOf('"', colonIndex + 1);
            if (valueStartIndex < 0)
                return string.Empty;

            int valueEndIndex = valueStartIndex + 1;
            while (valueEndIndex < responseText.Length)
            {
                if (responseText[valueEndIndex] == '"' && responseText[valueEndIndex - 1] != '\\')
                    break;

                valueEndIndex++;
            }

            if (valueEndIndex >= responseText.Length)
                return string.Empty;

            return responseText
                .Substring(valueStartIndex + 1, valueEndIndex - valueStartIndex - 1)
                .Replace("\\\"", "\"")
                .Replace("\\\\", "\\");
        }

        private void SetLicenseState(bool isValid, string message)
        {
            licenseValidated = true;
            licenseIsValid = isValid;
            licenseStatusMessage = isValid
                ? string.Empty
                : (string.IsNullOrWhiteSpace(message)
                    ? InvalidLicenseMessage
                    : message);
        }

        private void ValidateLicenseStatus()
        {
            string normalizedLicenseKey = NormalizeLicenseKey(LicenseKey);
            if (string.IsNullOrWhiteSpace(normalizedLicenseKey))
            {
                string savedLicenseKey = TryLoadSavedLicenseKey();
                if (!string.IsNullOrWhiteSpace(savedLicenseKey))
                {
                    LicenseKey = savedLicenseKey;
                    normalizedLicenseKey = savedLicenseKey;
                }
            }

            string machineId = GetMachineId();

            bool sameValidationRequest =
                string.Equals(lastValidatedLicenseKey, normalizedLicenseKey, StringComparison.Ordinal) &&
                string.Equals(lastValidatedMachineId, machineId, StringComparison.Ordinal) &&
                lastValidatedUseLocalLicenseServer == UseLocalLicenseServer;

            if (sameValidationRequest)
            {
                if (licenseValidated)
                    return;

                if (lastLicenseValidationAttemptUtc != DateTime.MinValue &&
                    (DateTime.UtcNow - lastLicenseValidationAttemptUtc).TotalSeconds < LicenseRetryIntervalSeconds)
                    return;
            }

            lastValidatedLicenseKey = normalizedLicenseKey;
            lastValidatedMachineId = machineId;
            lastValidatedUseLocalLicenseServer = UseLocalLicenseServer;
            lastLicenseValidationAttemptUtc = DateTime.UtcNow;

            if (string.IsNullOrWhiteSpace(normalizedLicenseKey))
            {
                SetLicenseState(false, EmptyLicenseMessage);
                return;
            }

            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;
            }
            catch
            {
            }

            try
            {
                string payload = "{\"licenseKey\":\"" + EscapeJsonValue(normalizedLicenseKey) + "\",\"license_key\":\"" + EscapeJsonValue(normalizedLicenseKey) + "\",\"product\":\"" + EscapeJsonValue(ProductDisplayName) + "\",\"product_name\":\"" + EscapeJsonValue(ProductDisplayName) + "\",\"machineId\":\"" + EscapeJsonValue(machineId) + "\",\"machine_id\":\"" + EscapeJsonValue(machineId) + "\"}";
                byte[] payloadBytes = Encoding.UTF8.GetBytes(payload);

                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(GetLicenseServerUrl());
                request.Method = "POST";
                request.ContentType = "application/json";
                request.Accept = "application/json";
                request.Timeout = LicenseRequestTimeoutMs;
                request.ReadWriteTimeout = LicenseRequestTimeoutMs;
                request.ContentLength = payloadBytes.Length;
                request.Proxy = null;

                using (Stream requestStream = request.GetRequestStream())
                    requestStream.Write(payloadBytes, 0, payloadBytes.Length);

                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (Stream responseStream = response.GetResponseStream())
                using (StreamReader reader = new StreamReader(responseStream))
                {
                    string responseText = reader.ReadToEnd();
                    bool isValid =
                        responseText.IndexOf("\"valid\":true", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        responseText.IndexOf("\"valid\": true", StringComparison.OrdinalIgnoreCase) >= 0;
                    string responseMessage = ExtractResponseMessage(responseText);

                    if (isValid)
                    {
                        SaveCachedLicense(normalizedLicenseKey, machineId);
                        SaveLastValidLicenseKey(normalizedLicenseKey);
                    }

                    SetLicenseState(
                        isValid,
                        isValid
                            ? string.Empty
                            : (string.IsNullOrWhiteSpace(responseMessage) ? InvalidLicenseMessage : responseMessage));
                }
            }
            catch (Exception ex)
            {
                Print(ProductDisplayName + " license validation failed: " + ex.Message);

                if (TryUseCachedLicense(normalizedLicenseKey, machineId))
                {
                    SetLicenseState(true, string.Empty);
                    return;
                }

                licenseValidated = false;
                licenseIsValid = false;
                licenseStatusMessage = InvalidLicenseMessage;
            }
        }
    }
}

#region NinjaScript generated code. Neither change nor remove.

namespace NinjaTrader.NinjaScript.Indicators
{
	public partial class Indicator : NinjaTrader.Gui.NinjaScript.IndicatorRenderBase
	{
		private GGSmiPrecision[] cacheGGSmiPrecision;
		public GGSmiPrecision GGSmiPrecision(int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine)
		{
			return GGSmiPrecision(Input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, string.Empty, false);
		}

		public GGSmiPrecision GGSmiPrecision(int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine, string licenseKey, bool useLocalLicenseServer)
		{
			return GGSmiPrecision(Input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, licenseKey, useLocalLicenseServer);
		}

		public GGSmiPrecision GGSmiPrecision(ISeries<double> input, int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine)
		{
			return GGSmiPrecision(input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, string.Empty, false);
		}

		public GGSmiPrecision GGSmiPrecision(ISeries<double> input, int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine, string licenseKey, bool useLocalLicenseServer)
		{
			if (cacheGGSmiPrecision != null)
				for (int idx = 0; idx < cacheGGSmiPrecision.Length; idx++)
					if (cacheGGSmiPrecision[idx] != null && cacheGGSmiPrecision[idx].LengthK == lengthK && cacheGGSmiPrecision[idx].LengthD == lengthD && cacheGGSmiPrecision[idx].LengthEMA == lengthEMA && cacheGGSmiPrecision[idx].Overbought == overbought && cacheGGSmiPrecision[idx].Oversold == oversold && cacheGGSmiPrecision[idx].ShowMiddleLine == showMiddleLine && cacheGGSmiPrecision[idx].LicenseKey == licenseKey && cacheGGSmiPrecision[idx].UseLocalLicenseServer == useLocalLicenseServer && cacheGGSmiPrecision[idx].EqualsInput(input))
						return cacheGGSmiPrecision[idx];
			return CacheIndicator<GGSmiPrecision>(new GGSmiPrecision() { LengthK = lengthK, LengthD = lengthD, LengthEMA = lengthEMA, Overbought = overbought, Oversold = oversold, ShowMiddleLine = showMiddleLine, LicenseKey = licenseKey, UseLocalLicenseServer = useLocalLicenseServer }, input, ref cacheGGSmiPrecision);
		}
	}
}

namespace NinjaTrader.NinjaScript.MarketAnalyzerColumns
{
	public partial class MarketAnalyzerColumn : MarketAnalyzerColumnBase
	{
		public Indicators.GGSmiPrecision GGSmiPrecision(int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine)
		{
			return indicator.GGSmiPrecision(Input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, string.Empty, false);
		}

		public Indicators.GGSmiPrecision GGSmiPrecision(int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSmiPrecision(Input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, licenseKey, useLocalLicenseServer);
		}

		public Indicators.GGSmiPrecision GGSmiPrecision(ISeries<double> input, int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine)
		{
			return indicator.GGSmiPrecision(input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, string.Empty, false);
		}

		public Indicators.GGSmiPrecision GGSmiPrecision(ISeries<double> input, int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSmiPrecision(input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, licenseKey, useLocalLicenseServer);
		}
	}
}

namespace NinjaTrader.NinjaScript.Strategies
{
	public partial class Strategy : NinjaTrader.Gui.NinjaScript.StrategyRenderBase
	{
		public Indicators.GGSmiPrecision GGSmiPrecision(int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine)
		{
			return indicator.GGSmiPrecision(Input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, string.Empty, false);
		}

		public Indicators.GGSmiPrecision GGSmiPrecision(int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSmiPrecision(Input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, licenseKey, useLocalLicenseServer);
		}

		public Indicators.GGSmiPrecision GGSmiPrecision(ISeries<double> input, int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine)
		{
			return indicator.GGSmiPrecision(input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, string.Empty, false);
		}

		public Indicators.GGSmiPrecision GGSmiPrecision(ISeries<double> input, int lengthK, int lengthD, int lengthEMA, double overbought, double oversold, bool showMiddleLine, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSmiPrecision(input, lengthK, lengthD, lengthEMA, overbought, oversold, showMiddleLine, licenseKey, useLocalLicenseServer);
		}
	}
}

#endregion
