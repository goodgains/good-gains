#region Using declarations
using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;
using System.Windows;
using System.Windows.Media;
using System.Xml.Serialization;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.Gui.Tools;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.DrawingTools;
#endregion

namespace NinjaTrader.NinjaScript.Indicators
{
    public class GGSessionHighLow : Indicator
    {
        private const string ProductDisplayName = "GG Session High/Low Indicator";
        private const string LocalLicenseServerUrl = "http://127.0.0.1:3000/api/verify-license";
        private const string ProductionLicenseServerUrl = "https://goodgainsindicators.com/api/verify-license";
        private const string EmptyLicenseMessage = "Enter License Key";
        private const string InvalidLicenseMessage = "Invalid License";
        private const int LicenseRequestTimeoutMs = 5000;
        private const string LicenseWarningTag = "GGSESSIONHIGHLOW_LICENSE_WARNING";
        private const string DefaultAsiaStart = "01:00";
        private const string DefaultAsiaEnd = "07:30";
        private const string DefaultLondonStart = "10:00";
        private const string DefaultLondonEnd = "18:30";
        private const string DefaultNewYorkStart = "16:30";
        private const string DefaultNewYorkEnd = "23:00";

        private SessionState asiaSession;
        private SessionState londonSession;
        private SessionState newYorkSession;
        private bool licenseValidated;
        private bool licenseIsValid;
        private bool lastValidatedUseLocalLicenseServer;
        private string licenseStatusMessage;
        private string lastValidatedLicenseKey;

        private class SessionState
        {
            public SessionState(string key, string title)
            {
                Key = key;
                Title = title;
                Reset();
            }

            public string Key { get; private set; }
            public string Title { get; private set; }
            public bool HasValues { get; set; }
            public int StartBar { get; set; }
            public int EndBar { get; set; }
            public double High { get; set; }
            public double Low { get; set; }
            public DateTime SessionDate { get; set; }

            public void Reset()
            {
                HasValues = false;
                StartBar = -1;
                EndBar = -1;
                High = double.MinValue;
                Low = double.MaxValue;
                SessionDate = Core.Globals.MinDate;
            }
        }

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = "Shows clean Asia, London, and New York session high/low levels with adjustable times and colors.";
                Name = "GG Session High/Low";
                Calculate = Calculate.OnBarClose;
                IsOverlay = true;
                DisplayInDataBox = false;
                DrawOnPricePanel = true;
                PaintPriceMarkers = false;
                IsAutoScale = false;
                IsSuspendedWhileInactive = true;

                AsiaStartTime = DefaultAsiaStart;
                AsiaEndTime = DefaultAsiaEnd;
                LondonStartTime = DefaultLondonStart;
                LondonEndTime = DefaultLondonEnd;
                NewYorkStartTime = DefaultNewYorkStart;
                NewYorkEndTime = DefaultNewYorkEnd;

                ShowAsiaSessionLevels = true;
                ShowLondonSessionLevels = true;
                ShowNewYorkSessionLevels = true;
                ShowLabels = true;
                ExtendLevelsToRight = true;

                LineWidth = 2;
                LineStyle = DashStyleHelper.Dash;

                AsiaHighBrush = CreateFrozenBrush(Color.FromRgb(74, 222, 128));
                AsiaLowBrush = CreateFrozenBrush(Color.FromRgb(16, 185, 129));
                LondonHighBrush = CreateFrozenBrush(Color.FromRgb(96, 165, 250));
                LondonLowBrush = CreateFrozenBrush(Color.FromRgb(59, 130, 246));
                NewYorkHighBrush = CreateFrozenBrush(Color.FromRgb(248, 113, 113));
                NewYorkLowBrush = CreateFrozenBrush(Color.FromRgb(251, 146, 60));
                LicenseKey = string.Empty;
                UseLocalLicenseServer = false;
                licenseValidated = false;
                licenseIsValid = false;
                licenseStatusMessage = string.Empty;
                lastValidatedLicenseKey = string.Empty;
                lastValidatedUseLocalLicenseServer = UseLocalLicenseServer;
            }
            else if (State == State.DataLoaded)
            {
                asiaSession = new SessionState("Asia", "Asia");
                londonSession = new SessionState("London", "London");
                newYorkSession = new SessionState("NewYork", "New York");
                ValidateLicenseStatus();
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < 0 || Bars == null)
                return;

            ValidateLicenseStatus();
            if (!licenseIsValid)
            {
                ClearSessionDrawingsForLicense();
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

            if (!IsIntradayChart())
                return;

            DateTime barTime = Time[0];

            ProcessSession(
                asiaSession,
                ShowAsiaSessionLevels,
                AsiaStartTime,
                AsiaEndTime,
                DefaultAsiaStart,
                DefaultAsiaEnd,
                AsiaHighBrush,
                AsiaLowBrush,
                barTime);

            ProcessSession(
                londonSession,
                ShowLondonSessionLevels,
                LondonStartTime,
                LondonEndTime,
                DefaultLondonStart,
                DefaultLondonEnd,
                LondonHighBrush,
                LondonLowBrush,
                barTime);

            ProcessSession(
                newYorkSession,
                ShowNewYorkSessionLevels,
                NewYorkStartTime,
                NewYorkEndTime,
                DefaultNewYorkStart,
                DefaultNewYorkEnd,
                NewYorkHighBrush,
                NewYorkLowBrush,
                barTime);
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

            if (licenseValidated &&
                string.Equals(lastValidatedLicenseKey, normalizedLicenseKey, StringComparison.Ordinal) &&
                lastValidatedUseLocalLicenseServer == UseLocalLicenseServer)
                return;

            lastValidatedLicenseKey = normalizedLicenseKey;
            lastValidatedUseLocalLicenseServer = UseLocalLicenseServer;

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
                string payload = "{\"licenseKey\":\"" + EscapeJsonValue(normalizedLicenseKey) + "\",\"product\":\"" + EscapeJsonValue(ProductDisplayName) + "\"}";
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

                    SetLicenseState(
                        isValid,
                        isValid ? string.Empty : InvalidLicenseMessage);
                }
            }
            catch (Exception ex)
            {
                Print(ProductDisplayName + " license validation failed: " + ex.Message);
                SetLicenseState(false, InvalidLicenseMessage);
            }
        }

        private void ClearSessionDrawingsForLicense()
        {
            ClearSessionStateForLicense(asiaSession);
            ClearSessionStateForLicense(londonSession);
            ClearSessionStateForLicense(newYorkSession);
        }

        private void ClearSessionStateForLicense(SessionState state)
        {
            if (state == null)
                return;

            if (state.SessionDate != Core.Globals.MinDate)
                RemoveSessionDrawObjects(state, state.SessionDate);

            state.Reset();
        }

        private void ProcessSession(
            SessionState state,
            bool showSession,
            string startText,
            string endText,
            string fallbackStart,
            string fallbackEnd,
            Brush highBrush,
            Brush lowBrush,
            DateTime barTime)
        {
            if (state == null)
                return;

            if (!showSession)
            {
                RemoveSessionDrawObjects(state, state.SessionDate);
                state.Reset();
                return;
            }

            TimeSpan start = ParseTime(startText, fallbackStart);
            TimeSpan end = ParseTime(endText, fallbackEnd);
            DateTime sessionDate = GetSessionDate(barTime, start, end);

            if (state.SessionDate != sessionDate)
            {
                if (state.SessionDate != Core.Globals.MinDate)
                    RemoveSessionDrawObjects(state, state.SessionDate);

                state.Reset();
                state.SessionDate = sessionDate;
            }

            DateTime sessionStart;
            DateTime sessionEnd;
            BuildSessionWindow(sessionDate, start, end, out sessionStart, out sessionEnd);

            bool inSession = barTime >= sessionStart && barTime <= sessionEnd;
            if (inSession)
            {
                if (!state.HasValues)
                {
                    state.HasValues = true;
                    state.StartBar = CurrentBar;
                    state.High = High[0];
                    state.Low = Low[0];
                }
                else
                {
                    state.High = Math.Max(state.High, High[0]);
                    state.Low = Math.Min(state.Low, Low[0]);
                }

                state.EndBar = CurrentBar;
            }

            if (!state.HasValues)
                return;

            if (barTime < sessionStart)
                return;

            if (barTime > sessionEnd && state.EndBar < 0)
                return;

            DrawSessionLine(state, state.SessionDate, true, state.High, highBrush);
            DrawSessionLine(state, state.SessionDate, false, state.Low, lowBrush);
        }

        private void DrawSessionLine(SessionState state, DateTime tradingDay, bool isHigh, double price, Brush brush)
        {
            int startBarsAgo = Math.Max(0, CurrentBar - state.StartBar);
            int anchorBar = ExtendLevelsToRight ? CurrentBar : state.EndBar;
            if (anchorBar < state.StartBar)
                anchorBar = CurrentBar;

            int endBarsAgo = Math.Max(0, CurrentBar - anchorBar);
            string tag = GetLineTag(state, tradingDay, isHigh);

            Draw.Line(
                this,
                tag,
                false,
                startBarsAgo,
                price,
                endBarsAgo,
                price,
                brush,
                LineStyle,
                LineWidth);

            if (ShowLabels)
            {
                int labelBarsAgo = ExtendLevelsToRight ? 0 : endBarsAgo;
                int yOffset = isHigh ? -12 : 12;
                string labelTag = GetLabelTag(state, tradingDay, isHigh);
                Draw.Text(
                    this,
                    labelTag,
                    false,
                    state.Title + " " + (isHigh ? "High" : "Low"),
                    labelBarsAgo,
                    price,
                    yOffset,
                    brush,
                    new SimpleFont("Segoe UI", 12),
                    TextAlignment.Left,
                    Brushes.Transparent,
                    Brushes.Transparent,
                    0);
            }
            else
            {
                RemoveDrawObject(GetLabelTag(state, tradingDay, isHigh));
            }
        }

        private void ResetSessionStates()
        {
            if (asiaSession != null)
                asiaSession.Reset();
            if (londonSession != null)
                londonSession.Reset();
            if (newYorkSession != null)
                newYorkSession.Reset();
        }

        private void RemoveSessionDrawObjects(SessionState state, DateTime tradingDay)
        {
            if (state == null || tradingDay == Core.Globals.MinDate)
                return;

            RemoveDrawObject(GetLineTag(state, tradingDay, true));
            RemoveDrawObject(GetLineTag(state, tradingDay, false));
            RemoveDrawObject(GetLabelTag(state, tradingDay, true));
            RemoveDrawObject(GetLabelTag(state, tradingDay, false));
        }

        private string GetLineTag(SessionState state, DateTime tradingDay, bool isHigh)
        {
            return string.Format(
                CultureInfo.InvariantCulture,
                "GGSessionHighLow_{0}_{1:yyyyMMdd}_{2}",
                state.Key,
                tradingDay,
                isHigh ? "High" : "Low");
        }

        private string GetLabelTag(SessionState state, DateTime tradingDay, bool isHigh)
        {
            return GetLineTag(state, tradingDay, isHigh) + "_Label";
        }

        private DateTime GetSessionDate(DateTime barTime, TimeSpan start, TimeSpan end)
        {
            if (end > start)
                return barTime.Date;

            return barTime.TimeOfDay >= start
                ? barTime.Date
                : barTime.Date.AddDays(-1);
        }

        private void BuildSessionWindow(DateTime sessionDate, TimeSpan start, TimeSpan end, out DateTime sessionStart, out DateTime sessionEnd)
        {
            sessionStart = sessionDate.Date.Add(start);

            if (end > start)
            {
                sessionEnd = sessionDate.Date.Add(end);
                return;
            }

            sessionEnd = sessionDate.Date.AddDays(1).Add(end);
        }

        private TimeSpan ParseTime(string value, string fallback)
        {
            TimeSpan parsed;
            if (TimeSpan.TryParseExact(value ?? string.Empty, @"hh\:mm", CultureInfo.InvariantCulture, out parsed))
                return parsed;

            if (TimeSpan.TryParseExact(value ?? string.Empty, @"h\:mm", CultureInfo.InvariantCulture, out parsed))
                return parsed;

            if (TimeSpan.TryParseExact(fallback, @"hh\:mm", CultureInfo.InvariantCulture, out parsed))
                return parsed;

            return TimeSpan.Zero;
        }


        private static Brush CreateFrozenBrush(Color color)
        {
            SolidColorBrush brush = new SolidColorBrush(color);
            brush.Freeze();
            return brush;
        }

        private bool IsIntradayChart()
        {
            if (BarsPeriod == null)
                return false;

            switch (BarsPeriod.BarsPeriodType)
            {
                case BarsPeriodType.Day:
                case BarsPeriodType.Month:
                case BarsPeriodType.Week:
                case BarsPeriodType.Year:
                    return false;
                default:
                    return true;
            }
        }

        [NinjaScriptProperty]
        [Display(Name = "Asia Start Time", Order = 1, GroupName = "Session Times")]
        public string AsiaStartTime { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Asia End Time", Order = 2, GroupName = "Session Times")]
        public string AsiaEndTime { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "London Start Time", Order = 3, GroupName = "Session Times")]
        public string LondonStartTime { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "London End Time", Order = 4, GroupName = "Session Times")]
        public string LondonEndTime { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "New York Start Time", Order = 5, GroupName = "Session Times")]
        public string NewYorkStartTime { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "New York End Time", Order = 6, GroupName = "Session Times")]
        public string NewYorkEndTime { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "License Key", Order = 1, GroupName = "License")]
        public string LicenseKey { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Use Local License Server", Order = 2, GroupName = "License")]
        public bool UseLocalLicenseServer { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show Asia session levels", Order = 1, GroupName = "Display")]
        public bool ShowAsiaSessionLevels { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show London session levels", Order = 2, GroupName = "Display")]
        public bool ShowLondonSessionLevels { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show New York session levels", Order = 3, GroupName = "Display")]
        public bool ShowNewYorkSessionLevels { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Show labels", Order = 4, GroupName = "Display")]
        public bool ShowLabels { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Extend levels to right", Order = 5, GroupName = "Display")]
        public bool ExtendLevelsToRight { get; set; }

        [NinjaScriptProperty]
        [Range(1, 10)]
        [Display(Name = "Line width", Order = 1, GroupName = "Style")]
        public int LineWidth { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Line style", Order = 2, GroupName = "Style")]
        public DashStyleHelper LineStyle { get; set; }

        [XmlIgnore]
        [Display(Name = "Asia High color", Order = 1, GroupName = "Colors")]
        public Brush AsiaHighBrush { get; set; }

        [Browsable(false)]
        public string AsiaHighBrushSerializable
        {
            get { return Serialize.BrushToString(AsiaHighBrush); }
            set { AsiaHighBrush = Serialize.StringToBrush(value); }
        }

        [XmlIgnore]
        [Display(Name = "Asia Low color", Order = 2, GroupName = "Colors")]
        public Brush AsiaLowBrush { get; set; }

        [Browsable(false)]
        public string AsiaLowBrushSerializable
        {
            get { return Serialize.BrushToString(AsiaLowBrush); }
            set { AsiaLowBrush = Serialize.StringToBrush(value); }
        }

        [XmlIgnore]
        [Display(Name = "London High color", Order = 3, GroupName = "Colors")]
        public Brush LondonHighBrush { get; set; }

        [Browsable(false)]
        public string LondonHighBrushSerializable
        {
            get { return Serialize.BrushToString(LondonHighBrush); }
            set { LondonHighBrush = Serialize.StringToBrush(value); }
        }

        [XmlIgnore]
        [Display(Name = "London Low color", Order = 4, GroupName = "Colors")]
        public Brush LondonLowBrush { get; set; }

        [Browsable(false)]
        public string LondonLowBrushSerializable
        {
            get { return Serialize.BrushToString(LondonLowBrush); }
            set { LondonLowBrush = Serialize.StringToBrush(value); }
        }

        [XmlIgnore]
        [Display(Name = "New York High color", Order = 5, GroupName = "Colors")]
        public Brush NewYorkHighBrush { get; set; }

        [Browsable(false)]
        public string NewYorkHighBrushSerializable
        {
            get { return Serialize.BrushToString(NewYorkHighBrush); }
            set { NewYorkHighBrush = Serialize.StringToBrush(value); }
        }

        [XmlIgnore]
        [Display(Name = "New York Low color", Order = 6, GroupName = "Colors")]
        public Brush NewYorkLowBrush { get; set; }

        [Browsable(false)]
        public string NewYorkLowBrushSerializable
        {
            get { return Serialize.BrushToString(NewYorkLowBrush); }
            set { NewYorkLowBrush = Serialize.StringToBrush(value); }
        }
    }
}


#region NinjaScript generated code. Neither change nor remove.

namespace NinjaTrader.NinjaScript.Indicators
{
	public partial class Indicator : NinjaTrader.Gui.NinjaScript.IndicatorRenderBase
	{
		private GGSessionHighLow[] cacheGGSessionHighLow;
		public GGSessionHighLow GGSessionHighLow(string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle)
		{
			return GGSessionHighLow(Input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, string.Empty, true);
		}

		public GGSessionHighLow GGSessionHighLow(string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle, string licenseKey, bool useLocalLicenseServer)
		{
			return GGSessionHighLow(Input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, licenseKey, useLocalLicenseServer);
		}

		public GGSessionHighLow GGSessionHighLow(ISeries<double> input, string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle)
		{
			return GGSessionHighLow(input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, string.Empty, true);
		}

		public GGSessionHighLow GGSessionHighLow(ISeries<double> input, string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle, string licenseKey, bool useLocalLicenseServer)
		{
			if (cacheGGSessionHighLow != null)
				for (int idx = 0; idx < cacheGGSessionHighLow.Length; idx++)
					if (cacheGGSessionHighLow[idx] != null && cacheGGSessionHighLow[idx].AsiaStartTime == asiaStartTime && cacheGGSessionHighLow[idx].AsiaEndTime == asiaEndTime && cacheGGSessionHighLow[idx].LondonStartTime == londonStartTime && cacheGGSessionHighLow[idx].LondonEndTime == londonEndTime && cacheGGSessionHighLow[idx].NewYorkStartTime == newYorkStartTime && cacheGGSessionHighLow[idx].NewYorkEndTime == newYorkEndTime && cacheGGSessionHighLow[idx].LicenseKey == licenseKey && cacheGGSessionHighLow[idx].UseLocalLicenseServer == useLocalLicenseServer && cacheGGSessionHighLow[idx].ShowAsiaSessionLevels == showAsiaSessionLevels && cacheGGSessionHighLow[idx].ShowLondonSessionLevels == showLondonSessionLevels && cacheGGSessionHighLow[idx].ShowNewYorkSessionLevels == showNewYorkSessionLevels && cacheGGSessionHighLow[idx].ShowLabels == showLabels && cacheGGSessionHighLow[idx].ExtendLevelsToRight == extendLevelsToRight && cacheGGSessionHighLow[idx].LineWidth == lineWidth && cacheGGSessionHighLow[idx].LineStyle == lineStyle && cacheGGSessionHighLow[idx].EqualsInput(input))
						return cacheGGSessionHighLow[idx];
			return CacheIndicator<GGSessionHighLow>(new GGSessionHighLow(){ AsiaStartTime = asiaStartTime, AsiaEndTime = asiaEndTime, LondonStartTime = londonStartTime, LondonEndTime = londonEndTime, NewYorkStartTime = newYorkStartTime, NewYorkEndTime = newYorkEndTime, LicenseKey = licenseKey, UseLocalLicenseServer = useLocalLicenseServer, ShowAsiaSessionLevels = showAsiaSessionLevels, ShowLondonSessionLevels = showLondonSessionLevels, ShowNewYorkSessionLevels = showNewYorkSessionLevels, ShowLabels = showLabels, ExtendLevelsToRight = extendLevelsToRight, LineWidth = lineWidth, LineStyle = lineStyle }, input, ref cacheGGSessionHighLow);
		}
	}
}

namespace NinjaTrader.NinjaScript.MarketAnalyzerColumns
{
	public partial class MarketAnalyzerColumn : MarketAnalyzerColumnBase
	{
		public Indicators.GGSessionHighLow GGSessionHighLow(string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle)
		{
			return indicator.GGSessionHighLow(Input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, string.Empty, true);
		}

		public Indicators.GGSessionHighLow GGSessionHighLow(ISeries<double> input , string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle)
		{
			return indicator.GGSessionHighLow(input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, string.Empty, true);
		}

		public Indicators.GGSessionHighLow GGSessionHighLow(string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSessionHighLow(Input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, licenseKey, useLocalLicenseServer);
		}

		public Indicators.GGSessionHighLow GGSessionHighLow(ISeries<double> input , string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSessionHighLow(input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, licenseKey, useLocalLicenseServer);
		}
	}
}

namespace NinjaTrader.NinjaScript.Strategies
{
	public partial class Strategy : NinjaTrader.Gui.NinjaScript.StrategyRenderBase
	{
		public Indicators.GGSessionHighLow GGSessionHighLow(string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle)
		{
			return indicator.GGSessionHighLow(Input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, string.Empty, true);
		}

		public Indicators.GGSessionHighLow GGSessionHighLow(ISeries<double> input , string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle)
		{
			return indicator.GGSessionHighLow(input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, string.Empty, true);
		}

		public Indicators.GGSessionHighLow GGSessionHighLow(string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSessionHighLow(Input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, licenseKey, useLocalLicenseServer);
		}

		public Indicators.GGSessionHighLow GGSessionHighLow(ISeries<double> input , string asiaStartTime, string asiaEndTime, string londonStartTime, string londonEndTime, string newYorkStartTime, string newYorkEndTime, bool showAsiaSessionLevels, bool showLondonSessionLevels, bool showNewYorkSessionLevels, bool showLabels, bool extendLevelsToRight, int lineWidth, DashStyleHelper lineStyle, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.GGSessionHighLow(input, asiaStartTime, asiaEndTime, londonStartTime, londonEndTime, newYorkStartTime, newYorkEndTime, showAsiaSessionLevels, showLondonSessionLevels, showNewYorkSessionLevels, showLabels, extendLevelsToRight, lineWidth, lineStyle, licenseKey, useLocalLicenseServer);
		}
	}
}

#endregion
