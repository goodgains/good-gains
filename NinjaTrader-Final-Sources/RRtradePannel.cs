#region Using declarations
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.Gui.Chart;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.Indicators;
using SharpDX;
using DxBrush = SharpDX.Direct2D1.SolidColorBrush;
using D2DColor = SharpDX.Color;
using DWriteFactory = SharpDX.DirectWrite.Factory;
using DWriteTextFormat = SharpDX.DirectWrite.TextFormat;
using WpfColor = System.Windows.Media.Color;
using WpfSolidColorBrush = System.Windows.Media.SolidColorBrush;
#endregion

namespace NinjaTrader.NinjaScript.AddOns
{
    public class RRtradePannelAutoAttachAddOn : AddOnBase
    {
        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "RRtradePannelAutoAttachAddOn";
                Description = "Manual attach only. RRtradePannel is added to charts by the user.";
            }
        }
    }
}

namespace NinjaTrader.NinjaScript.Indicators
{
    public class RRtradePannel : Indicator
    {
        private const string ProductDisplayName = "GG RR Trade Panel";
        private const string LocalLicenseServerUrl = "http://127.0.0.1:3000/api/verify-license";
        private const string ProductionLicenseServerUrl = "https://goodgainsindicators.com/api/verify-license";
        private const string EmptyLicenseMessage = "Enter License Key";
        private const string InvalidLicenseMessage = "Invalid License";
        private const string ActiveLicenseMessage = "License active";
        private const int LicenseRequestTimeoutMs = 5000;
        private static readonly object HostUiOwnerSync = new object();
        private static readonly Dictionary<Window, WeakReference<RRtradePannel>> HostUiOwners = new Dictionary<Window, WeakReference<RRtradePannel>>();

        private enum PlanMode
        {
            Idle,
            AwaitEntry,
            Ready
        }

        private enum DragHandle
        {
            None,
            Entry,
            Stop,
            Target,
            ResizeTarget,
            ResizeStop,
            Resize
        }

        private enum TradeSide
        {
            None,
            Long,
            Short
        }

        private enum PriceReferenceMode
        {
            Last,
            LongEntry,
            ShortEntry,
            LongExit,
            ShortExit
        }

        private Grid chartGrid;
        private Window hostWindow;
        private Canvas plannerOverlay;
        private Border panel;
        private Border licenseBorder;
        private StackPanel panelBody;

        private TextBlock titleText;
        private TextBlock infoText;
        private TextBlock licenseStatusText;
        private TextBlock pnlLiveText;
        private TextBlock rrPanelText;
        private TextBlock tpPointsValueText;
        private TextBlock slPointsValueText;
        private TextBlock tpDollarsValueText;
        private TextBlock slDollarsValueText;

        private Border pnlLiveBorder;
        private CheckBox limitCheck;
        private ComboBox accountComboBox;
        private TextBox licenseKeyTextBox;
        private TextBlock quantityValueText;

        private Button longButton;
        private Button shortButton;
        private Button applyLicenseButton;
        private Button changeLicenseButton;
        private Button closeButton;
        private Button clearPanelButton;
        private Button sendButton;
        private Button sellButton;
        private Button tpMinusButton;
        private Button tpPlusButton;
        private Button slMinusButton;
        private Button slPlusButton;
        private Button tpPresetButton;
        private Button slPresetButton;
        private Button qtyMinusButton;
        private Button qtyPlusButton;

        private DispatcherTimer uiRefreshTimer;
        private DispatcherTimer liveExitSyncTimer;

        private NinjaTrader.Gui.Chart.ChartTrader chartTraderControl;
        private ChartControl activeChartControl;
        private ChartPanel activeChartPanel;
        private NinjaTrader.Gui.Tools.QuantityUpDown chartTraderQuantitySelector;
        private NinjaTrader.Gui.Tools.AccountSelector chartTraderAccountSelector;
        private DWriteFactory overlayTextFactory;
        private DWriteTextFormat overlaySmallTextFormat;
        private DWriteTextFormat overlayLargeTextFormat;

        private readonly HashSet<Account> subscribedAccounts = new HashSet<Account>();
        private readonly Dictionary<FrameworkElement, Visibility> chartTraderVisibilityRestore = new Dictionary<FrameworkElement, Visibility>();
        private readonly Dictionary<string, PendingTrade> pendingTrades = new Dictionary<string, PendingTrade>(StringComparer.Ordinal);
        private readonly Dictionary<string, int> missingManagedExitSyncCounts = new Dictionary<string, int>(StringComparer.Ordinal);
        private readonly List<Account> availableAccounts = new List<Account>();

        internal bool IsAutoAttachedInstance { get; set; }

        private bool uiInstalled;
        private bool ownsHostUi;
        private bool panelCollapsed;
        private bool pnlCollapsed;
        private bool pendingManualExitSync;
        private bool showLicenseEditor;
        private PendingCloseRequest pendingCloseRequest;
        private DateTime nextUiInstallAttempt;
        private DateTime suppressLiveSnapshotUntil;
        private int panelQuantity = 1;

        private PlanMode planMode;
        private DragHandle dragHandle;
        private TradeSide selectedSide;

        private DateTime entryTime;
        private double entryPrice;
        private double stopPrice;
        private double targetPrice;

        private double dragStartPrice;
        private double dragStartEntryPrice;
        private double dragStartStopPrice;
        private double dragStartTargetPrice;

        private double tpPointsValue;
        private double slPointsValue;

        private string lastInstrumentFullName;
        private double lastInstrumentPointValue;
        private double lastInstrumentTickSize;
        private string cachedSelectedAccountName;
        private string cachedSelectedInstrumentFullName;
        private bool licenseValidated;
        private bool licenseIsValid;
        private bool lastValidatedUseLocalLicenseServer;
        private string licenseStatusMessage;
        private string lastValidatedLicenseKey;

        [NinjaScriptProperty]
        [Display(Name = "Panel Left", Order = 1, GroupName = "Layout")]
        public int PanelLeft { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Panel Top", Order = 2, GroupName = "Layout")]
        public int PanelTop { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Box Width", Order = 3, GroupName = "Layout")]
        public int BoxWidthPixels { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "PTS Presets", Order = 4, GroupName = "Behavior")]
        public string PointsPresetValues { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "License Key", Order = 1, GroupName = "License")]
        public string LicenseKey { get; set; }

        [NinjaScriptProperty]
        [Display(Name = "Use Local License Server", Order = 2, GroupName = "License")]
        public bool UseLocalLicenseServer { get; set; }

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = "Risk-reward panel for Chart Trader with draggable entry, stop, and target.";
                Name = "RRtradePannel";
                Calculate = Calculate.OnEachTick;
                IsOverlay = true;
                DrawOnPricePanel = true;
                IsAutoScale = true;
                DisplayInDataBox = false;
                PaintPriceMarkers = false;
                IsSuspendedWhileInactive = true;

                PanelLeft = 12;
                PanelTop = 40;
                BoxWidthPixels = 280;
                PointsPresetValues = "1,2,5,10,15,20";
                LicenseKey = string.Empty;
                UseLocalLicenseServer = false;
                tpPointsValue = 15;
                slPointsValue = 15;
                licenseValidated = false;
                licenseIsValid = false;
                licenseStatusMessage = string.Empty;
                lastValidatedLicenseKey = string.Empty;
                lastValidatedUseLocalLicenseServer = UseLocalLicenseServer;
            }
            else if (State == State.DataLoaded)
            {
                ValidateLicenseStatus();
            }
            else if (State == State.Historical)
            {
                ValidateLicenseStatus();
                if (ChartControl != null)
                    ChartControl.Dispatcher.InvokeAsync(InstallUi);
            }
            else if (State == State.Terminated)
            {
                StopUiRefreshTimer();
                StopLiveExitSyncTimer();
                DisposeOverlayTextResources();

                if (ChartControl != null)
                    ChartControl.Dispatcher.InvokeAsync(RemoveUi);

                foreach (Account account in subscribedAccounts.ToList())
                {
                    try
                    {
                        account.ExecutionUpdate -= OnExecutionUpdate;
                        account.OrderUpdate -= OnOrderUpdate;
                    }
                    catch
                    {
                    }
                }

                subscribedAccounts.Clear();
                pendingTrades.Clear();
            }
        }

        protected override void OnBarUpdate()
        {
            ValidateLicenseStatus();

            if (!uiInstalled && ChartControl != null && Core.Globals.Now >= nextUiInstallAttempt)
            {
                nextUiInstallAttempt = Core.Globals.Now.AddSeconds(2);

                try
                {
                    ChartControl.Dispatcher.InvokeAsync(InstallUi);
                }
                catch
                {
                }
            }
        }

        public void RequestUiInstall()
        {
            if (ChartControl == null)
                return;

            nextUiInstallAttempt = Core.Globals.MinDate;

            try
            {
                ChartControl.Dispatcher.InvokeAsync(InstallUi);
            }
            catch
            {
            }
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
                ? ActiveLicenseMessage
                : (string.IsNullOrWhiteSpace(message)
                    ? InvalidLicenseMessage
                    : message);

            ApplyLicenseStateToUi();
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
                        isValid ? ActiveLicenseMessage : InvalidLicenseMessage);
                }
            }
            catch (Exception ex)
            {
                Print(ProductDisplayName + " license validation failed: " + ex.Message);
                SetLicenseState(false, InvalidLicenseMessage);
            }
        }

        private bool IsLicenseCurrentlyValid()
        {
            ValidateLicenseStatus();
            return licenseValidated && licenseIsValid;
        }

        private bool EnsureLicenseAllowsTrading()
        {
            if (IsLicenseCurrentlyValid())
                return true;

            showLicenseEditor = true;
            ApplyLicenseStateToUi();
            SetInfoText(string.IsNullOrWhiteSpace(licenseStatusMessage) ? InvalidLicenseMessage : licenseStatusMessage);
            return false;
        }

        private void ApplyLicenseStateToUi()
        {
            bool canTrade = licenseValidated && licenseIsValid;
            bool shouldShowLicenseEditor = !canTrade || showLicenseEditor;

            if (licenseKeyTextBox != null && !licenseKeyTextBox.IsKeyboardFocused)
                licenseKeyTextBox.Text = LicenseKey ?? string.Empty;

            if (licenseStatusText != null)
            {
                licenseStatusText.Text = canTrade ? ActiveLicenseMessage : (string.IsNullOrWhiteSpace(licenseStatusMessage) ? InvalidLicenseMessage : licenseStatusMessage);
                licenseStatusText.Foreground = canTrade ? Brushes.LightGreen : Brushes.OrangeRed;
            }

            if (licenseBorder != null)
                licenseBorder.Visibility = (!canTrade || shouldShowLicenseEditor) ? Visibility.Visible : Visibility.Collapsed;

            if (licenseKeyTextBox != null)
                licenseKeyTextBox.Visibility = shouldShowLicenseEditor ? Visibility.Visible : Visibility.Collapsed;

            if (applyLicenseButton != null)
                applyLicenseButton.Visibility = shouldShowLicenseEditor ? Visibility.Visible : Visibility.Collapsed;

            if (changeLicenseButton != null)
                changeLicenseButton.Visibility = canTrade && !shouldShowLicenseEditor ? Visibility.Visible : Visibility.Collapsed;

            if (panelBody != null)
            {
                panelBody.IsEnabled = canTrade;
                panelBody.Opacity = canTrade ? 1.0 : 0.45;
            }

            if (sendButton != null)
            {
                sendButton.IsEnabled = canTrade;
                sendButton.Opacity = canTrade ? 1.0 : 0.55;
                sendButton.ToolTip = canTrade ? null : licenseStatusMessage;
            }

            if (sellButton != null)
            {
                sellButton.IsEnabled = canTrade;
                sellButton.Opacity = canTrade ? 1.0 : 0.55;
                sellButton.ToolTip = canTrade ? null : licenseStatusMessage;
            }

            if (closeButton != null)
            {
                closeButton.IsEnabled = canTrade;
                closeButton.Opacity = canTrade ? 1.0 : 0.55;
                closeButton.ToolTip = canTrade ? null : licenseStatusMessage;
            }

            if (infoText != null)
            {
                if (!canTrade && !string.IsNullOrWhiteSpace(licenseStatusMessage))
                    infoText.Text = licenseStatusMessage;
                else if (canTrade && (string.IsNullOrWhiteSpace(infoText.Text) || string.Equals(infoText.Text.Trim(), EmptyLicenseMessage, StringComparison.Ordinal) || string.Equals(infoText.Text.Trim(), InvalidLicenseMessage, StringComparison.Ordinal)))
                    infoText.Text = "Press Long or Short, then click Entry on this chart.";
            }
        }

        private bool TryAcquireHostUiOwnership(Window resolvedHostWindow)
        {
            if (resolvedHostWindow == null)
                return false;

            lock (HostUiOwnerSync)
            {
                WeakReference<RRtradePannel> existingReference;
                RRtradePannel existingOwner;

                if (HostUiOwners.TryGetValue(resolvedHostWindow, out existingReference) &&
                    existingReference != null &&
                    existingReference.TryGetTarget(out existingOwner) &&
                    existingOwner != null &&
                    !ReferenceEquals(existingOwner, this))
                {
                    ownsHostUi = false;
                    return false;
                }

                HostUiOwners[resolvedHostWindow] = new WeakReference<RRtradePannel>(this);
                ownsHostUi = true;
                return true;
            }
        }

        private bool IsHostUiOwner()
        {
            if (!ownsHostUi || hostWindow == null)
                return false;

            lock (HostUiOwnerSync)
            {
                WeakReference<RRtradePannel> existingReference;
                RRtradePannel existingOwner;

                return HostUiOwners.TryGetValue(hostWindow, out existingReference) &&
                    existingReference != null &&
                    existingReference.TryGetTarget(out existingOwner) &&
                    ReferenceEquals(existingOwner, this);
            }
        }

        private void ReleaseHostUiOwnership()
        {
            lock (HostUiOwnerSync)
            {
                if (hostWindow != null)
                {
                    WeakReference<RRtradePannel> existingReference;
                    RRtradePannel existingOwner;

                    if (HostUiOwners.TryGetValue(hostWindow, out existingReference) &&
                        existingReference != null &&
                        existingReference.TryGetTarget(out existingOwner) &&
                        ReferenceEquals(existingOwner, this))
                    {
                        HostUiOwners.Remove(hostWindow);
                    }
                }
            }

            ownsHostUi = false;
        }

        public override void OnCalculateMinMax()
        {
            if (hostWindow != null && !IsHostUiOwner())
                return;

            Instrument selectedInstrument = GetSelectedTradeInstrument();
            if (ChartBars == null || selectedInstrument == null)
                return;

            double min = double.MaxValue;
            double max = double.MinValue;

            int fromIndex = Math.Max(ChartBars.FromIndex, 0);
            int toIndex = Math.Max(ChartBars.ToIndex, fromIndex);

            for (int index = fromIndex; index <= toIndex; index++)
            {
                min = Math.Min(min, Low.GetValueAt(index));
                max = Math.Max(max, High.GetValueAt(index));
            }

            if (planMode != PlanMode.Idle && entryTime != default(DateTime))
            {
                min = Math.Min(min, entryPrice);
                min = Math.Min(min, stopPrice);
                min = Math.Min(min, targetPrice);
                max = Math.Max(max, entryPrice);
                max = Math.Max(max, stopPrice);
                max = Math.Max(max, targetPrice);
            }

            if (min == double.MaxValue || max == double.MinValue)
                return;

            double padding = selectedInstrument.MasterInstrument.TickSize * 4;
            MinValue = min - padding;
            MaxValue = max + padding;
        }

        protected override void OnRender(ChartControl chartControl, ChartScale chartScale)
        {
            base.OnRender(chartControl, chartScale);

            if (hostWindow != null && !IsHostUiOwner())
                return;

            if (!IsLicenseCurrentlyValid())
                return;

            if (planMode == PlanMode.Idle || entryTime == default(DateTime))
                return;

            float leftX = chartControl.GetXByTime(entryTime);
            float rightX = leftX + BoxWidthPixels;
            float maxRight = chartControl.CanvasRight - 80f;
            if (rightX > maxRight)
                rightX = maxRight;
            if (rightX <= leftX + 40f)
                rightX = leftX + 40f;

            float entryY = chartScale.GetYByValue(entryPrice);

            using (var entryLineBrush = new DxBrush(RenderTarget, new D2DColor(90, 220, 255, 255)))
            using (var rewardFillBrush = new DxBrush(RenderTarget, new D2DColor(8, 92, 56, 85)))
            using (var riskFillBrush = new DxBrush(RenderTarget, new D2DColor(122, 24, 24, 85)))
            using (var rewardHandleBrush = new DxBrush(RenderTarget, new D2DColor(160, 255, 190, 255)))
            using (var riskHandleBrush = new DxBrush(RenderTarget, new D2DColor(255, 182, 182, 255)))
            {
                RenderTarget.DrawLine(new Vector2(leftX, entryY), new Vector2(rightX, entryY), entryLineBrush, 1.5f);

                ResolvedPlan resolved;
                if (!TryBuildResolvedPlan(out resolved))
                    return;

                float stopY = chartScale.GetYByValue(resolved.StopPrice);
                float targetY = chartScale.GetYByValue(resolved.TargetPrice);

                RectangleF rewardRect = new RectangleF(leftX, Math.Min(entryY, targetY), rightX - leftX, Math.Abs(entryY - targetY));
                RectangleF riskRect = new RectangleF(leftX, Math.Min(entryY, stopY), rightX - leftX, Math.Abs(entryY - stopY));

                RenderTarget.FillRectangle(rewardRect, rewardFillBrush);
                RenderTarget.FillRectangle(riskRect, riskFillBrush);

                TradeMetrics metrics;
                bool isLong;
                if (!TryGetMetrics(out metrics, out isLong))
                    return;

                int quantity = GetLiveOrPlannedQuantity();
                float labelX = leftX + 10f;
                float tpLabelY = isLong ? rewardRect.Top - 18f : rewardRect.Bottom + 4f;
                float slLabelY = isLong ? riskRect.Bottom + 4f : riskRect.Top - 22f;

                DrawOverlayLabel("TP " + metrics.RewardPoints.ToString("0.00") + " pts | $" + metrics.RewardDollars(quantity).ToString("0"), labelX, tpLabelY, new D2DColor(228, 218, 145, 185), 15f);
                DrawOverlayLabel((metrics.StopLocksProfit ? "LOCK " : "SL ") + metrics.RiskPoints.ToString("0.00") + " pts | " + (metrics.StopDollars(quantity) >= 0 ? "+$" : "-$") + Math.Abs(metrics.StopDollars(quantity)).ToString("0"), labelX, slLabelY, new D2DColor(228, 218, 145, 185), 15f);
                bool targetIsUpperCorner = targetY <= stopY;
                DrawPlannerResizeHandle(rightX, targetY, rewardHandleBrush, targetIsUpperCorner);
                DrawPlannerResizeHandle(rightX, stopY, riskHandleBrush, !targetIsUpperCorner);
            }
        }

        private void InstallUi()
        {
            if (uiInstalled || ChartControl == null)
                return;

            Window resolvedHostWindow = Window.GetWindow(ChartControl.Parent);
            if (resolvedHostWindow == null)
                return;

            if (hostWindow != null && !ReferenceEquals(hostWindow, resolvedHostWindow))
                ReleaseHostUiOwnership();

            hostWindow = resolvedHostWindow;
            if (!TryAcquireHostUiOwnership(hostWindow))
                return;

            chartGrid = hostWindow != null ? hostWindow.Content as Grid : null;
            if (chartGrid == null)
            {
                ReleaseHostUiOwnership();
                return;
            }

            RefreshChartTraderReferences();
            WpfSolidColorBrush panelTextBrush = new WpfSolidColorBrush(WpfColor.FromRgb(212, 212, 212));

            longButton = CreateButton("Long");
            shortButton = CreateButton("Short");
            closeButton = CreateButton("Close");
            clearPanelButton = CreateButton("Clear Panel");
            sendButton = CreateButton("Buy");
            sellButton = CreateButton("Sell");
            tpMinusButton = CreateSpinnerButton("\u25BE");
            tpPlusButton = CreateSpinnerButton("\u25B4");
            slMinusButton = CreateSpinnerButton("\u25BE");
            slPlusButton = CreateSpinnerButton("\u25B4");
            tpPresetButton = CreateSpinnerButton("\u25BE");
            slPresetButton = CreateSpinnerButton("\u25BE");
            qtyMinusButton = CreateSpinnerButton("\u25BE");
            qtyPlusButton = CreateSpinnerButton("\u25B4");

            longButton.Width = 86;
            shortButton.Width = 86;
            sendButton.Background = new WpfSolidColorBrush(WpfColor.FromRgb(38, 92, 58));
            sendButton.BorderBrush = new WpfSolidColorBrush(WpfColor.FromRgb(96, 170, 122));
            sellButton.Background = new WpfSolidColorBrush(WpfColor.FromRgb(132, 38, 38));
            sellButton.BorderBrush = new WpfSolidColorBrush(WpfColor.FromRgb(210, 96, 96));
            closeButton.Background = new WpfSolidColorBrush(WpfColor.FromRgb(120, 54, 24));
            closeButton.BorderBrush = new WpfSolidColorBrush(WpfColor.FromRgb(220, 140, 88));
            clearPanelButton.Background = new WpfSolidColorBrush(WpfColor.FromRgb(54, 54, 54));
            clearPanelButton.BorderBrush = new WpfSolidColorBrush(WpfColor.FromRgb(112, 112, 112));

            tpPointsValueText = CreateValueText(tpPointsValue);
            slPointsValueText = CreateValueText(slPointsValue);
            tpDollarsValueText = CreateDollarText();
            slDollarsValueText = CreateDollarText();

            tpDollarsValueText.Foreground = Brushes.LightGreen;
            slDollarsValueText.Foreground = Brushes.Salmon;

            limitCheck = new CheckBox
            {
                Content = "Limit",
                Foreground = panelTextBrush,
                VerticalAlignment = VerticalAlignment.Center,
                IsHitTestVisible = true
            };

            infoText = new TextBlock
            {
                Foreground = panelTextBrush,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 10, 0, 0),
                FontSize = 12,
                Visibility = Visibility.Visible,
                Text = "Press Long or Short, then click Entry on this chart."
            };

            pnlLiveText = new TextBlock
            {
                Foreground = panelTextBrush,
                TextWrapping = TextWrapping.NoWrap,
                Margin = new Thickness(0),
                FontSize = 12,
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                TextAlignment = System.Windows.TextAlignment.Center,
                Text = "PnL : Flat"
            };

            rrPanelText = new TextBlock
            {
                Foreground = new WpfSolidColorBrush(WpfColor.FromRgb(90, 220, 255)),
                TextWrapping = TextWrapping.NoWrap,
                Margin = new Thickness(8, 0, 0, 6),
                FontSize = 12,
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Right,
                TextAlignment = System.Windows.TextAlignment.Right,
                Text = string.Empty
            };

            licenseStatusText = new TextBlock
            {
                Foreground = Brushes.OrangeRed,
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 0, 8, 0),
                FontSize = 12,
                VerticalAlignment = VerticalAlignment.Center,
                Text = EmptyLicenseMessage
            };

            licenseKeyTextBox = new TextBox
            {
                Text = LicenseKey ?? string.Empty,
                Height = 24,
                Margin = new Thickness(0, 6, 8, 0),
                MinWidth = 170
            };

            applyLicenseButton = CreateButton("Apply License");
            applyLicenseButton.Height = 24;
            applyLicenseButton.MinWidth = 104;
            applyLicenseButton.Padding = new Thickness(8, 0, 8, 0);
            applyLicenseButton.Margin = new Thickness(0, 6, 0, 0);

            changeLicenseButton = CreateButton("Change License");
            changeLicenseButton.Height = 22;
            changeLicenseButton.MinWidth = 102;
            changeLicenseButton.Padding = new Thickness(8, 0, 8, 0);
            changeLicenseButton.Margin = new Thickness(0);
            changeLicenseButton.Visibility = Visibility.Collapsed;

            pnlLiveBorder = new Border
            {
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(220, 24, 24, 24)),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(120, 88, 88, 88)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(12, 2, 12, 2),
                CornerRadius = new CornerRadius(2),
                HorizontalAlignment = HorizontalAlignment.Stretch,
                Child = pnlLiveText,
                Cursor = Cursors.Hand,
                Margin = new Thickness(0, 6, 0, 0)
            };

            titleText = new TextBlock
            {
                Text = "Good Gains RR Trade Panel",
                Foreground = panelTextBrush,
                FontSize = 15,
                VerticalAlignment = VerticalAlignment.Center,
                Cursor = Cursors.Hand
            };

            accountComboBox = new ComboBox
            {
                Height = 22,
                Margin = new Thickness(0, 2, 12, 0),
                DisplayMemberPath = "Name",
                HorizontalAlignment = HorizontalAlignment.Stretch
            };

            quantityValueText = new TextBlock
            {
                Text = "1",
                Foreground = Brushes.White,
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Center,
                TextAlignment = System.Windows.TextAlignment.Center
            };

            Grid buttonRow = new Grid { Margin = new Thickness(0, 8, 0, 4) };
            buttonRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            buttonRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            Grid.SetColumn(longButton, 0);
            Grid.SetColumn(shortButton, 1);
            buttonRow.Children.Add(longButton);
            buttonRow.Children.Add(shortButton);
            ConfigurePointsPresetButton(tpPresetButton, true);
            ConfigurePointsPresetButton(slPresetButton, false);

            Grid tpHeaderRow = BuildMetricRow("TP pts", tpPointsValueText, tpDollarsValueText, tpPlusButton, tpMinusButton, tpPresetButton, panelTextBrush);
            Grid slHeaderRow = BuildMetricRow("SL pts", slPointsValueText, slDollarsValueText, slPlusButton, slMinusButton, slPresetButton, panelTextBrush);

            Grid actionGrid = new Grid { Margin = new Thickness(0, 12, 0, 0) };
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actionGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            actionGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            Grid limitAndRrGrid = new Grid();
            limitAndRrGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            limitAndRrGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            Grid.SetRow(sellButton, 0);
            Grid.SetColumn(sellButton, 0);
            Grid.SetRow(sendButton, 1);
            Grid.SetColumn(sendButton, 0);
            Grid.SetRow(closeButton, 1);
            Grid.SetColumn(closeButton, 1);
            Grid.SetRow(limitAndRrGrid, 0);
            Grid.SetColumn(limitAndRrGrid, 1);
            Grid.SetColumn(limitCheck, 0);
            Grid.SetColumn(rrPanelText, 1);

            sellButton.Margin = new Thickness(2, 0, 6, 6);
            sendButton.Margin = new Thickness(2, 0, 6, 0);
            closeButton.Margin = new Thickness(6, 0, 2, 0);
            limitCheck.Margin = new Thickness(4, 0, 4, 6);

            limitAndRrGrid.Children.Add(limitCheck);
            limitAndRrGrid.Children.Add(rrPanelText);
            actionGrid.Children.Add(sellButton);
            actionGrid.Children.Add(limitAndRrGrid);
            actionGrid.Children.Add(sendButton);
            actionGrid.Children.Add(closeButton);

            clearPanelButton.Margin = new Thickness(2, 8, 2, 0);

            Grid selectorGrid = new Grid { Margin = new Thickness(0, 10, 0, 0) };
            selectorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            selectorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(84) });
            selectorGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            selectorGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            TextBlock accountLabel = new TextBlock
            {
                Text = "Account",
                Foreground = panelTextBrush,
                Margin = new Thickness(0, 0, 0, 2)
            };

            TextBlock qtyLabel = new TextBlock
            {
                Text = "Order qty",
                Foreground = panelTextBrush,
                Margin = new Thickness(0, 0, 0, 2),
                HorizontalAlignment = HorizontalAlignment.Left
            };

            Grid.SetRow(accountLabel, 0);
            Grid.SetColumn(accountLabel, 0);
            Grid.SetRow(qtyLabel, 0);
            Grid.SetColumn(qtyLabel, 1);
            Grid.SetRow(accountComboBox, 1);
            Grid.SetColumn(accountComboBox, 0);

            Grid qtySelectorGrid = new Grid
            {
                Margin = new Thickness(0, 2, 0, 0),
                Width = 64,
                HorizontalAlignment = HorizontalAlignment.Left
            };
            qtySelectorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(44) });
            qtySelectorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(18) });

            Border qtyValueBorder = new Border
            {
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(255, 48, 48, 48)),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(255, 88, 88, 88)),
                BorderThickness = new Thickness(1),
                Height = 22,
                Width = 44,
                Margin = new Thickness(0, 0, 2, 0),
                Child = quantityValueText
            };

            Grid qtyArrowGrid = new Grid
            {
                Width = 18,
                Height = 22,
                Margin = new Thickness(0)
            };
            qtyArrowGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(11) });
            qtyArrowGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(11) });

            Grid.SetColumn(qtyValueBorder, 0);
            Grid.SetColumn(qtyArrowGrid, 1);
            Grid.SetRow(qtyPlusButton, 0);
            Grid.SetRow(qtyMinusButton, 1);
            qtyArrowGrid.Children.Add(qtyPlusButton);
            qtyArrowGrid.Children.Add(qtyMinusButton);
            qtySelectorGrid.Children.Add(qtyValueBorder);
            qtySelectorGrid.Children.Add(qtyArrowGrid);

            Grid.SetRow(qtySelectorGrid, 1);
            Grid.SetColumn(qtySelectorGrid, 1);

            selectorGrid.Children.Add(accountLabel);
            selectorGrid.Children.Add(qtyLabel);
            selectorGrid.Children.Add(accountComboBox);
            selectorGrid.Children.Add(qtySelectorGrid);

            Grid headerRow = new Grid { Margin = new Thickness(0, 0, 0, 8) };
            headerRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Grid.SetColumn(titleText, 0);
            headerRow.Children.Add(titleText);

            Grid licenseStatusRow = new Grid { Margin = new Thickness(0, 0, 0, 6) };
            licenseStatusRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            licenseStatusRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Grid.SetColumn(licenseStatusText, 0);
            Grid.SetColumn(changeLicenseButton, 1);
            licenseStatusRow.Children.Add(licenseStatusText);
            licenseStatusRow.Children.Add(changeLicenseButton);

            Grid licenseEditorGrid = new Grid();
            licenseEditorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            licenseEditorGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Grid.SetColumn(licenseKeyTextBox, 0);
            Grid.SetColumn(applyLicenseButton, 1);
            licenseEditorGrid.Children.Add(licenseKeyTextBox);
            licenseEditorGrid.Children.Add(applyLicenseButton);

            StackPanel licenseContent = new StackPanel();
            licenseContent.Children.Add(licenseStatusRow);
            licenseContent.Children.Add(licenseEditorGrid);

            licenseBorder = new Border
            {
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(255, 42, 42, 42)),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(110, 96, 96, 96)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(2),
                Padding = new Thickness(8, 6, 8, 8),
                Margin = new Thickness(0, 0, 0, 8),
                Child = licenseContent
            };

            panelBody = new StackPanel();
            panelBody.Children.Add(buttonRow);
            panelBody.Children.Add(tpHeaderRow);
            panelBody.Children.Add(slHeaderRow);
            panelBody.Children.Add(pnlLiveBorder);
            panelBody.Children.Add(actionGrid);
            panelBody.Children.Add(clearPanelButton);

            StackPanel panelContent = new StackPanel();
            panelContent.Children.Add(headerRow);
            panelContent.Children.Add(licenseBorder);
            panelContent.Children.Add(panelBody);

            panel = new Border
            {
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(255, 48, 48, 48)),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(120, 72, 72, 72)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(6),
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Top,
                Margin = new Thickness(0, 8, 8, 0),
                Width = 304,
                MinWidth = 248,
                MaxWidth = 360,
                Child = panelContent
            };

            EnsurePlannerOverlayAttached();
            AttachPanelToHost();

            longButton.Click += OnLongClicked;
            shortButton.Click += OnShortClicked;
            closeButton.Click += OnCloseClicked;
            clearPanelButton.Click += OnClearPanelClicked;
            sendButton.Click += OnSendClicked;
            sellButton.Click += OnSellClicked;
            tpMinusButton.Click += OnTpMinusClicked;
            tpPlusButton.Click += OnTpPlusClicked;
            slMinusButton.Click += OnSlMinusClicked;
            slPlusButton.Click += OnSlPlusClicked;
            qtyMinusButton.Click += OnQtyMinusClicked;
            qtyPlusButton.Click += OnQtyPlusClicked;
            applyLicenseButton.Click += OnApplyLicenseClicked;
            changeLicenseButton.Click += OnChangeLicenseClicked;
            titleText.MouseLeftButtonDown += OnTitleTextMouseLeftButtonDown;
            pnlLiveBorder.MouseLeftButtonDown += OnPnlBorderMouseLeftButtonDown;

            RefreshActiveChartContext();
            if (chartGrid != null)
            {
                chartGrid.MouseLeftButtonDown += OnChartMouseDown;
                chartGrid.MouseMove += OnChartMouseMove;
                chartGrid.MouseLeftButtonUp += OnChartMouseUp;
            }

            if (hostWindow != null)
                hostWindow.PreviewKeyDown += OnHostWindowPreviewKeyDown;

            uiInstalled = true;
            StartUiRefreshTimer();
            ResetInstrumentTracking();
            PopulateAccountComboIfNeeded();
            InitializePanelQuantity();
            RefreshPanelSelectors();
            UpdateSelectionCache();
            RefreshPointControls();
            ResetPlan();
            ApplyChartTraderVisibilityTweaks();
            SyncPanelLayout();
            ApplyLicenseStateToUi();
        }

        private void RemoveUi()
        {
            if (!uiInstalled)
            {
                ReleaseHostUiOwnership();
                return;
            }

            StopUiRefreshTimer();
            StopLiveExitSyncTimer();

            if (longButton != null) longButton.Click -= OnLongClicked;
            if (shortButton != null) shortButton.Click -= OnShortClicked;
            if (closeButton != null) closeButton.Click -= OnCloseClicked;
            if (clearPanelButton != null) clearPanelButton.Click -= OnClearPanelClicked;
            if (sendButton != null) sendButton.Click -= OnSendClicked;
            if (sellButton != null) sellButton.Click -= OnSellClicked;
            if (tpMinusButton != null) tpMinusButton.Click -= OnTpMinusClicked;
            if (tpPlusButton != null) tpPlusButton.Click -= OnTpPlusClicked;
            if (slMinusButton != null) slMinusButton.Click -= OnSlMinusClicked;
            if (slPlusButton != null) slPlusButton.Click -= OnSlPlusClicked;
            if (qtyMinusButton != null) qtyMinusButton.Click -= OnQtyMinusClicked;
            if (qtyPlusButton != null) qtyPlusButton.Click -= OnQtyPlusClicked;
            if (applyLicenseButton != null) applyLicenseButton.Click -= OnApplyLicenseClicked;
            if (changeLicenseButton != null) changeLicenseButton.Click -= OnChangeLicenseClicked;

            if (titleText != null)
                titleText.MouseLeftButtonDown -= OnTitleTextMouseLeftButtonDown;
            if (pnlLiveBorder != null)
                pnlLiveBorder.MouseLeftButtonDown -= OnPnlBorderMouseLeftButtonDown;

            if (chartGrid != null)
            {
                chartGrid.MouseLeftButtonDown -= OnChartMouseDown;
                chartGrid.MouseMove -= OnChartMouseMove;
                chartGrid.MouseLeftButtonUp -= OnChartMouseUp;
            }
            activeChartControl = null;
            activeChartPanel = null;

            if (hostWindow != null)
                hostWindow.PreviewKeyDown -= OnHostWindowPreviewKeyDown;

            RestoreChartTraderVisibilityTweaks();
            DetachPanelFromHost();
            DetachPlannerOverlay();
            ReleaseHostUiOwnership();

            panel = null;
            licenseBorder = null;
            chartGrid = null;
            hostWindow = null;
            uiInstalled = false;
        }

        private void StartUiRefreshTimer()
        {
            if (uiRefreshTimer != null)
                return;

            uiRefreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(500)
            };
            uiRefreshTimer.Tick += OnUiRefreshTimerTick;
            uiRefreshTimer.Start();
        }

        private void StopUiRefreshTimer()
        {
            if (uiRefreshTimer == null)
                return;

            uiRefreshTimer.Stop();
            uiRefreshTimer.Tick -= OnUiRefreshTimerTick;
            uiRefreshTimer = null;
        }

        private void StopLiveExitSyncTimer()
        {
            if (liveExitSyncTimer == null)
                return;

            liveExitSyncTimer.Stop();
            liveExitSyncTimer.Tick -= OnLiveExitSyncTimerTick;
            liveExitSyncTimer = null;
        }

        private void EnsureOverlayTextResources()
        {
            if (overlayTextFactory == null)
                overlayTextFactory = new DWriteFactory();

            if (overlaySmallTextFormat == null)
                overlaySmallTextFormat = new DWriteTextFormat(overlayTextFactory, "Arial", 12f);

            if (overlayLargeTextFormat == null)
                overlayLargeTextFormat = new DWriteTextFormat(overlayTextFactory, "Arial", 15f);
        }

        private void DisposeOverlayTextResources()
        {
            if (overlaySmallTextFormat != null)
            {
                overlaySmallTextFormat.Dispose();
                overlaySmallTextFormat = null;
            }

            if (overlayLargeTextFormat != null)
            {
                overlayLargeTextFormat.Dispose();
                overlayLargeTextFormat = null;
            }

            if (overlayTextFactory != null)
            {
                overlayTextFactory.Dispose();
                overlayTextFactory = null;
            }
        }

        private void OnUiRefreshTimerTick(object sender, EventArgs e)
        {
            if (!uiInstalled)
                return;

            if (!IsHostUiOwner())
            {
                RemoveUi();
                return;
            }

            RefreshChartTraderReferences();
            RefreshActiveChartContext();

            if (!IsCurrentChartVisible())
            {
                if (panel != null)
                    panel.Visibility = Visibility.Collapsed;
                if (plannerOverlay != null)
                    plannerOverlay.Children.Clear();
                return;
            }

            if (panel != null)
                panel.Visibility = Visibility.Visible;

            EnsurePanelAttachedToCurrentHost();
            EnsurePlannerOverlayAttached();
            PopulateAccountComboIfNeeded();
            RefreshPanelSelectors();
            UpdateSelectionCache();
            ApplyChartTraderVisibilityTweaks();
            SyncPanelLayout();
            HandleInstrumentChanged();
            RefreshPointControls();
            RefreshLivePnlDisplay();
            RefreshPlannerOverlay();
            RefreshRrPanelText();
            TrySubmitPendingCloseRequest();
            if (dragHandle == DragHandle.None)
                SyncPlanFromPendingEntrySnapshot();

            if (dragHandle == DragHandle.None && !pendingManualExitSync && Core.Globals.Now >= suppressLiveSnapshotUntil)
                SyncPlanFromLiveOrdersSnapshot();

            CleanupManagedStateIfFlat();
        }

        private void SyncPanelLayout()
        {
            if (panel == null)
                return;

            double targetWidth = 304;
            double left = 0;
            double top = 8;

            Rect chartTraderRegion;
            if (TryGetChartTraderRegion(out chartTraderRegion))
            {
                targetWidth = Math.Max(264, Math.Min(360, chartTraderRegion.Width - 12));
                left = Math.Max(0, chartTraderRegion.Right - targetWidth - 8);
                top = Math.Max(0, chartTraderRegion.Top + 8);
            }
            else
            {
                if (chartTraderControl != null && chartTraderControl.ActualWidth > 120)
                    targetWidth = Math.Max(264, Math.Min(360, chartTraderControl.ActualWidth - 12));

                if (chartGrid != null && chartGrid.ActualWidth > targetWidth)
                    left = Math.Max(0, chartGrid.ActualWidth - targetWidth - 8);
            }

            panel.Width = targetWidth;
            panel.MinWidth = Math.Min(248, targetWidth);
            panel.MaxWidth = targetWidth;
            panel.HorizontalAlignment = HorizontalAlignment.Left;
            panel.VerticalAlignment = VerticalAlignment.Top;
            panel.Margin = new Thickness(left, top, 0, 0);
        }

        private void RefreshChartTraderReferences()
        {
            try
            {
                if (hostWindow == null && ChartControl != null)
                    hostWindow = Window.GetWindow(ChartControl.Parent);

                if (hostWindow == null)
                    return;

                NinjaTrader.Gui.Chart.ChartTrader visibleTrader =
                    FindVisibleElementByType<NinjaTrader.Gui.Chart.ChartTrader>(hostWindow) ??
                    FindElementByType<NinjaTrader.Gui.Chart.ChartTrader>(hostWindow);

                if (!ReferenceEquals(chartTraderControl, visibleTrader))
                {
                    chartTraderControl = visibleTrader;
                    chartTraderQuantitySelector = null;
                    chartTraderAccountSelector = null;
                }

                if (chartTraderControl != null)
                {
                    chartTraderQuantitySelector =
                        FindVisibleElementByType<NinjaTrader.Gui.Tools.QuantityUpDown>(chartTraderControl) ??
                        FindElementByType<NinjaTrader.Gui.Tools.QuantityUpDown>(chartTraderControl);

                    chartTraderAccountSelector =
                        FindVisibleElementByType<NinjaTrader.Gui.Tools.AccountSelector>(chartTraderControl) ??
                        FindElementByType<NinjaTrader.Gui.Tools.AccountSelector>(chartTraderControl);
                }
            }
            catch
            {
            }
        }

        private void RefreshActiveChartContext()
        {
            ChartControl visibleChartControl = null;

            try
            {
                if (hostWindow != null)
                {
                    string instrumentFullName = chartTraderControl != null && chartTraderControl.Instrument != null
                        ? chartTraderControl.Instrument.FullName
                        : string.Empty;

                    if (!string.IsNullOrWhiteSpace(instrumentFullName))
                        visibleChartControl = FindVisibleChartControlForInstrument(hostWindow, instrumentFullName);

                    if (visibleChartControl == null)
                        visibleChartControl = FindVisibleElementByType<ChartControl>(hostWindow);
                }
            }
            catch
            {
            }

            if (visibleChartControl == null)
                visibleChartControl = ChartControl;

            activeChartControl = visibleChartControl;
            activeChartPanel = ResolveActiveChartPanel(activeChartControl);
        }

        private void AttachChartInputHandlers(ChartControl chartControl)
        {
            if (chartControl == null)
                return;

            chartControl.MouseLeftButtonDown -= OnChartMouseDown;
            chartControl.MouseMove -= OnChartMouseMove;
            chartControl.MouseLeftButtonUp -= OnChartMouseUp;
            chartControl.MouseLeftButtonDown += OnChartMouseDown;
            chartControl.MouseMove += OnChartMouseMove;
            chartControl.MouseLeftButtonUp += OnChartMouseUp;
        }

        private void DetachChartInputHandlers(ChartControl chartControl)
        {
            if (chartControl == null)
                return;

            chartControl.MouseLeftButtonDown -= OnChartMouseDown;
            chartControl.MouseMove -= OnChartMouseMove;
            chartControl.MouseLeftButtonUp -= OnChartMouseUp;
        }

        private ChartControl GetInteractionChartControl()
        {
            return activeChartControl ?? ChartControl;
        }

        private ChartPanel ResolveActiveChartPanel(ChartControl chartControl)
        {
            if (chartControl != null && chartControl.ChartPanels != null)
            {
                foreach (ChartPanel panelCandidate in chartControl.ChartPanels)
                {
                    if (panelCandidate != null && panelCandidate.IsVisible && panelCandidate.PanelIndex == 0)
                        return panelCandidate;
                }

                foreach (ChartPanel panelCandidate in chartControl.ChartPanels)
                {
                    if (panelCandidate != null && panelCandidate.IsVisible)
                        return panelCandidate;
                }
            }

            return ChartPanel;
        }

        private ChartPanel GetInteractionChartPanel()
        {
            return activeChartPanel ?? ChartPanel;
        }

        private ChartControl FindVisibleChartControlForInstrument(DependencyObject parent, string instrumentFullName)
        {
            if (parent == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return null;

            ChartControl chartControl = parent as ChartControl;
            if (chartControl != null &&
                chartControl.IsVisible &&
                chartControl.ActualWidth > 0 &&
                chartControl.ActualHeight > 0 &&
                chartControl.Instrument != null &&
                string.Equals(chartControl.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
            {
                return chartControl;
            }

            int childCount = VisualTreeHelper.GetChildrenCount(parent);
            for (int i = 0; i < childCount; i++)
            {
                ChartControl nested = FindVisibleChartControlForInstrument(VisualTreeHelper.GetChild(parent, i), instrumentFullName);
                if (nested != null)
                    return nested;
            }

            return null;
        }

        private void PopulateAccountComboIfNeeded()
        {
            if (accountComboBox == null)
                return;

            try
            {
                Account existing = accountComboBox.SelectedItem as Account;
                string selectedName = existing != null ? existing.Name : string.Empty;
                List<Account> accounts = GetAvailableAccounts();

                bool needsRefresh = accountComboBox.Items.Count != accounts.Count;
                if (!needsRefresh)
                {
                    foreach (Account account in accounts)
                    {
                        if (!accountComboBox.Items.Contains(account))
                        {
                            needsRefresh = true;
                            break;
                        }
                    }
                }

                if (!needsRefresh)
                    return;

                accountComboBox.Items.Clear();
                foreach (Account account in accounts)
                    accountComboBox.Items.Add(account);

                Account preferred = accounts.FirstOrDefault(a => a != null && string.Equals(a.Name, selectedName, StringComparison.OrdinalIgnoreCase));
                if (preferred == null && chartTraderAccountSelector != null && chartTraderAccountSelector.SelectedAccount != null)
                    preferred = accounts.FirstOrDefault(a => a != null && string.Equals(a.Name, chartTraderAccountSelector.SelectedAccount.Name, StringComparison.OrdinalIgnoreCase));

                if (preferred == null)
                    preferred = accounts.FirstOrDefault();

                accountComboBox.SelectedItem = preferred;
            }
            catch
            {
            }
        }

        private void RefreshPanelSelectors()
        {
            if (accountComboBox == null)
                return;

            Account selected = accountComboBox.SelectedItem as Account;
            if (selected == null || !accountComboBox.Items.Contains(selected))
            {
                Account fallback = null;
                if (chartTraderAccountSelector != null && chartTraderAccountSelector.SelectedAccount != null)
                {
                    fallback = accountComboBox.Items.OfType<Account>()
                        .FirstOrDefault(a => a != null && string.Equals(a.Name, chartTraderAccountSelector.SelectedAccount.Name, StringComparison.OrdinalIgnoreCase));
                }

                if (fallback == null)
                    fallback = accountComboBox.Items.OfType<Account>().FirstOrDefault();

                accountComboBox.SelectedItem = fallback;
            }

            UpdateQuantityDisplay();
        }

        private void HandleInstrumentChanged()
        {
            Instrument selectedInstrument = GetSelectedTradeInstrument();
            if (selectedInstrument == null || selectedInstrument.MasterInstrument == null)
                return;

            string currentFullName = selectedInstrument.FullName ?? string.Empty;
            double currentPointValue = selectedInstrument.MasterInstrument.PointValue;
            double currentTickSize = selectedInstrument.MasterInstrument.TickSize;

            bool firstSnapshot = string.IsNullOrEmpty(lastInstrumentFullName);
            bool fullNameChanged = !string.Equals(lastInstrumentFullName, currentFullName, StringComparison.OrdinalIgnoreCase);
            bool instrumentChanged =
                fullNameChanged ||
                Math.Abs(lastInstrumentPointValue - currentPointValue) > double.Epsilon ||
                Math.Abs(lastInstrumentTickSize - currentTickSize) > double.Epsilon;

            if (!instrumentChanged)
                return;

            lastInstrumentFullName = currentFullName;
            lastInstrumentPointValue = currentPointValue;
            lastInstrumentTickSize = currentTickSize;

            tpPointsValue = NormalizePointValue(tpPointsValue);
            slPointsValue = NormalizePointValue(slPointsValue);

            if (fullNameChanged && !firstSnapshot)
            {
                ResetPlan();
                return;
            }

            if (planMode == PlanMode.Ready && entryTime != default(DateTime))
            {
                entryPrice = RoundToTick(entryPrice);
                stopPrice = RoundToTick(stopPrice);
                targetPrice = RoundToTick(targetPrice);
                UpdatePendingTradeBlueprints();
                UpdateInfoText();
                ForceRefresh();
            }
            else if (!firstSnapshot)
            {
                ForceRefresh();
            }
        }

        private void ResetInstrumentTracking()
        {
            Instrument selectedInstrument = GetSelectedTradeInstrument();
            lastInstrumentFullName = selectedInstrument != null ? selectedInstrument.FullName : string.Empty;
            lastInstrumentPointValue = selectedInstrument != null && selectedInstrument.MasterInstrument != null
                ? selectedInstrument.MasterInstrument.PointValue
                : 0;
            lastInstrumentTickSize = selectedInstrument != null && selectedInstrument.MasterInstrument != null
                ? selectedInstrument.MasterInstrument.TickSize
                : 0;
        }

        private void OnHostWindowPreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key != Key.Escape && e.Key != Key.Delete)
                return;

            bool hasActivePlan =
                planMode != PlanMode.Idle ||
                selectedSide != TradeSide.None ||
                entryPrice > 0 ||
                stopPrice > 0 ||
                targetPrice > 0;

            if (!hasActivePlan)
                return;

            ResetPlan();
            e.Handled = true;
        }

        private void OnLongClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            RefreshChartTraderReferences();
            RefreshActiveChartContext();
            ResetPlan();
            selectedSide = TradeSide.Long;
            planMode = PlanMode.AwaitEntry;
            SetInfoText("Long selected. Click Entry on this chart.");
        }

        private void OnShortClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            RefreshChartTraderReferences();
            RefreshActiveChartContext();
            ResetPlan();
            selectedSide = TradeSide.Short;
            planMode = PlanMode.AwaitEntry;
            SetInfoText("Short selected. Click Entry on this chart.");
        }

        private void OnCloseClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            try
            {
                Account account = GetSelectedChartAccount();
                Instrument selectedInstrument = GetSelectedTradeInstrument();
                if (account == null || selectedInstrument == null)
                {
                    SetInfoText("Could not detect account or instrument.");
                    return;
                }

                EnsureSubscribed(account);

                string instrumentFullName = selectedInstrument.FullName;
                Position livePosition = GetLiveInstrumentPosition(account);
                bool hasLivePosition = livePosition != null && livePosition.MarketPosition != MarketPosition.Flat && livePosition.Quantity > 0;
                bool submittedAction = false;

                if (hasLivePosition)
                {
                    Order[] blockingOrders = GetActiveCloseBlockingOrders(account, instrumentFullName);
                    if (blockingOrders.Length > 0)
                    {
                        pendingCloseRequest = new PendingCloseRequest
                        {
                            Account = account,
                            Instrument = selectedInstrument,
                            Quantity = livePosition.Quantity
                        };

                        Order[] cancelableOrders = blockingOrders
                            .Where(o => o.OrderState != OrderState.CancelPending)
                            .ToArray();

                        if (cancelableOrders.Length > 0)
                            account.Cancel(cancelableOrders);

                        RemovePendingTradesForInstrument(account, instrumentFullName);
                        pendingManualExitSync = false;
                        suppressLiveSnapshotUntil = Core.Globals.Now.AddSeconds(3);
                        SetInfoText("Cancelling working orders before close...");
                        return;
                    }

                    pendingCloseRequest = null;
                    SubmitCloseOrder(account, selectedInstrument, livePosition.Quantity, livePosition.MarketPosition);
                    submittedAction = true;
                }
                else
                {
                    pendingCloseRequest = null;
                    Order[] managedOrders = GetActiveManagedOrders(account, instrumentFullName);
                    if (managedOrders.Length > 0)
                    {
                        account.Cancel(managedOrders);
                        submittedAction = true;
                    }
                }

                RemovePendingTradesForInstrument(account, instrumentFullName);
                pendingManualExitSync = false;
                suppressLiveSnapshotUntil = Core.Globals.Now.AddMilliseconds(1200);

                if (submittedAction)
                {
                    if (!hasLivePosition)
                        ResetPlan();

                    SetInfoText("Close requested for " + account.Name + ".");
                }
                else
                    SetInfoText("No active RR orders or live position to close.");
            }
            catch (Exception ex)
            {
                SetInfoText("Close failed: " + ex.Message);
            }
        }

        private void OnClearPanelClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            ResetPlan();
        }

        private void OnApplyLicenseClicked(object sender, RoutedEventArgs e)
        {
            LicenseKey = licenseKeyTextBox != null ? licenseKeyTextBox.Text ?? string.Empty : string.Empty;
            licenseValidated = false;
            showLicenseEditor = false;
            ValidateLicenseStatus();

            if (!licenseIsValid)
                showLicenseEditor = true;

            ApplyLicenseStateToUi();

            if (!licenseIsValid && licenseKeyTextBox != null)
            {
                licenseKeyTextBox.Focus();
                licenseKeyTextBox.SelectAll();
            }
        }

        private void OnChangeLicenseClicked(object sender, RoutedEventArgs e)
        {
            showLicenseEditor = true;
            ApplyLicenseStateToUi();

            if (licenseKeyTextBox != null)
            {
                licenseKeyTextBox.Focus();
                licenseKeyTextBox.SelectAll();
            }
        }

        private void TrySubmitPendingCloseRequest()
        {
            if (!IsLicenseCurrentlyValid())
                return;

            if (pendingCloseRequest == null)
                return;

            try
            {
                Account account = pendingCloseRequest.Account;
                Instrument instrument = pendingCloseRequest.Instrument;
                string instrumentFullName = instrument != null ? instrument.FullName : string.Empty;
                if (account == null || instrument == null || string.IsNullOrWhiteSpace(instrumentFullName))
                {
                    pendingCloseRequest = null;
                    return;
                }

                Position livePosition = GetInstrumentPosition(account, instrumentFullName);
                if (livePosition == null || livePosition.MarketPosition == MarketPosition.Flat || livePosition.Quantity <= 0)
                {
                    pendingCloseRequest = null;
                    ResetPlan();
                    return;
                }

                if (GetActiveCloseBlockingOrders(account, instrumentFullName).Length > 0)
                    return;

                int quantity = Math.Min(Math.Max(1, pendingCloseRequest.Quantity), livePosition.Quantity);
                pendingCloseRequest = null;
                SubmitCloseOrder(account, instrument, quantity, livePosition.MarketPosition);
                SetInfoText("Close submitted to " + account.Name + ".");
            }
            catch (Exception ex)
            {
                pendingCloseRequest = null;
                SetInfoText("Close failed: " + ex.Message);
            }
        }

        private void SubmitCloseOrder(Account account, Instrument instrument, int quantity, MarketPosition marketPosition)
        {
            if (!IsLicenseCurrentlyValid())
                return;

            if (account == null || instrument == null || quantity < 1 || marketPosition == MarketPosition.Flat)
                return;

            OrderAction closeAction = marketPosition == MarketPosition.Long
                ? OrderAction.Sell
                : OrderAction.BuyToCover;

            Order closeOrder = account.CreateOrder(
                instrument,
                closeAction,
                OrderType.Market,
                OrderEntry.Manual,
                TimeInForce.Day,
                quantity,
                0,
                0,
                string.Empty,
                "RRPANEL_CLOSE",
                Core.Globals.MaxDate,
                null);

            account.Submit(new[] { closeOrder });
        }

        private void OnTitleTextMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            panelCollapsed = !panelCollapsed;
            if (panelBody != null)
                panelBody.Visibility = panelCollapsed ? Visibility.Collapsed : Visibility.Visible;
            if (titleText != null)
                titleText.Text = panelCollapsed ? "Good Gains RR Trade Panel +" : "Good Gains RR Trade Panel";
            e.Handled = true;
        }

        private void OnPnlBorderMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            pnlCollapsed = !pnlCollapsed;
            RefreshLivePnlDisplay();
            e.Handled = true;
        }

        private void OnTpMinusClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            double step = GetPointsAdjustmentStep();
            tpPointsValue = NormalizePointValue(Math.Max(step, tpPointsValue - step));
            RefreshPointControls();
            ReapplyOffsetsIfReady();
        }

        private void OnTpPlusClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            tpPointsValue = NormalizePointValue(tpPointsValue + GetPointsAdjustmentStep());
            RefreshPointControls();
            ReapplyOffsetsIfReady();
        }

        private void OnSlMinusClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            double step = GetPointsAdjustmentStep();
            slPointsValue = NormalizePointValue(Math.Max(step, slPointsValue - step));
            RefreshPointControls();
            ReapplyOffsetsIfReady();
        }

        private void OnSlPlusClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            slPointsValue = NormalizePointValue(slPointsValue + GetPointsAdjustmentStep());
            RefreshPointControls();
            ReapplyOffsetsIfReady();
        }

        private void OnQtyMinusClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            SetPanelQuantity(panelQuantity - 1);
        }

        private void OnQtyPlusClicked(object sender, RoutedEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            SetPanelQuantity(panelQuantity + 1);
        }

        private void OnSendClicked(object sender, RoutedEventArgs e)
        {
            ExecuteSend(TradeSide.Long, "Buy");
        }

        private void OnSellClicked(object sender, RoutedEventArgs e)
        {
            ExecuteSend(TradeSide.Short, "Sell");
        }

        private void ExecuteSend(TradeSide defaultSide, string actionLabel)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            try
            {
                Instrument selectedInstrument = GetSelectedTradeInstrument();
                Account account = GetSelectedChartAccount();
                int quantity = GetChartTraderQuantity();

                if (selectedInstrument == null || account == null)
                {
                    SetInfoText("Could not detect account or instrument.");
                    return;
                }

                if (quantity < 1)
                {
                    SetInfoText("Quantity must be at least 1.");
                    return;
                }

                EnsureSubscribed(account);

                string instrumentFullName = selectedInstrument.FullName;
                Position livePosition = GetInstrumentPosition(account, instrumentFullName);
                bool hasLivePosition = livePosition != null && livePosition.MarketPosition != MarketPosition.Flat && livePosition.Quantity > 0;

                if (!hasLivePosition && HasActiveWorkingOrders(account, instrumentFullName))
                {
                    SetInfoText("Cancel working live orders on this instrument before a new entry.");
                    return;
                }

                if (hasLivePosition)
                {
                    bool closingLong = livePosition.MarketPosition == MarketPosition.Long && defaultSide == TradeSide.Short;
                    bool closingShort = livePosition.MarketPosition == MarketPosition.Short && defaultSide == TradeSide.Long;

                    if (closingLong || closingShort)
                    {
                        OrderAction closeAction = closingLong ? OrderAction.Sell : OrderAction.BuyToCover;
                        int closeQuantity = Math.Min(quantity, livePosition.Quantity);

                        Order closeOrder = account.CreateOrder(
                            selectedInstrument,
                            closeAction,
                            OrderType.Market,
                            OrderEntry.Manual,
                            TimeInForce.Day,
                            closeQuantity,
                            0,
                            0,
                            string.Empty,
                            "RRPANEL_PARTIAL_CLOSE",
                            Core.Globals.MaxDate,
                            null);

                        account.Submit(new[] { closeOrder });
                        SetInfoText(actionLabel + " closed " + closeQuantity + " contract(s).");
                        return;
                    }
                }

                if (selectedSide != TradeSide.None && selectedSide != defaultSide)
                {
                    SetInfoText(actionLabel + " works only with " + (defaultSide == TradeSide.Long ? "Long" : "Short") + ".");
                    return;
                }

                if (planMode != PlanMode.Ready)
                {
                    bool quickUseLimit = limitCheck != null && limitCheck.IsChecked.GetValueOrDefault();
                    if (!quickUseLimit)
                    {
                        if (selectedSide == TradeSide.None)
                            selectedSide = defaultSide;

                        if (!TryBuildQuickMarketPlan())
                        {
                            SetInfoText("Could not build market entry from current price.");
                            return;
                        }
                    }
                    else
                    {
                        SetInfoText("Complete Entry, Stop, and Target first.");
                        return;
                    }
                }

                ResolvedPlan resolved;
                if (!TryBuildResolvedPlan(out resolved))
                {
                    SetInfoText("Target and Stop must stay on opposite sides of Entry.");
                    return;
                }

                string tagRoot = "RRPANEL_" + Guid.NewGuid().ToString("N");
                OrderAction entryAction = selectedSide == TradeSide.Short ? OrderAction.SellShort : OrderAction.Buy;
                OrderAction exitAction = selectedSide == TradeSide.Short ? OrderAction.BuyToCover : OrderAction.Sell;
                bool useLimit = limitCheck != null && limitCheck.IsChecked.GetValueOrDefault();

                Order entryOrder = BuildEntryOrder(account, selectedInstrument, entryAction, quantity, resolved.EntryPrice, useLimit, tagRoot + "_ENTRY");
                if (entryOrder == null)
                {
                    SetInfoText("Send failed: order could not be created.");
                    return;
                }

                pendingTrades[tagRoot] = new PendingTrade
                {
                    Account = account,
                    Instrument = selectedInstrument,
                    ExitAction = exitAction,
                    EntryOrderId = entryOrder.OrderId,
                    EntryOrderName = tagRoot + "_ENTRY",
                    PlannedEntryPrice = resolved.EntryPrice,
                    StopPrice = resolved.StopPrice,
                    TargetPrice = resolved.TargetPrice,
                    IsLong = resolved.IsLong,
                    AlignToFillPrice = !useLimit,
                    OcoId = Guid.NewGuid().ToString("N")
                };

                account.Submit(new[] { entryOrder });
                SetInfoText(actionLabel + " order submitted to " + account.Name + " @ " + resolved.EntryPrice.ToString("0.00") + ".");
            }
            catch (Exception ex)
            {
                SetInfoText(actionLabel + " failed: " + ex.Message);
            }
        }

        private bool TryBuildQuickMarketPlan()
        {
            if (selectedSide == TradeSide.None)
                return false;

            double referencePrice = GetSelectedInstrumentPrice(
                selectedSide == TradeSide.Long ? PriceReferenceMode.LongEntry : PriceReferenceMode.ShortEntry);

            if (referencePrice <= 0)
                return false;

            entryPrice = RoundToTick(referencePrice);

            ChartControl chartControl = GetInteractionChartControl();
            ChartPanel chartPanel = GetInteractionChartPanel();
            DateTime selectedBarTime;
            if (TryGetSelectedInstrumentBarTime(out selectedBarTime) &&
                IsChartTimeVisible(chartControl, chartPanel, selectedBarTime))
            {
                entryTime = selectedBarTime;
            }
            else if (chartControl != null && chartPanel != null)
            {
                double anchorX = GetDefaultPlannerAnchorX(chartControl, chartPanel);
                entryTime = chartControl.GetTimeByX((int)anchorX);
            }
            else
            {
                entryTime = Core.Globals.Now;
            }

            ApplyOffsetsFromPanel();
            planMode = PlanMode.Ready;
            UpdatePendingTradeBlueprints();
            UpdateInfoText();
            ForceRefresh();
            return true;
        }

        private void OnChartMouseDown(object sender, MouseButtonEventArgs e)
        {
            if (!EnsureLicenseAllowsTrading())
                return;

            RefreshChartTraderReferences();
            RefreshActiveChartContext();
            ChartControl chartControl = sender as ChartControl ?? GetInteractionChartControl();
            if (chartControl == null || planMode == PlanMode.Idle)
                return;

            System.Windows.Point point = e.GetPosition(chartControl);
            if (IsOverPanel(point) || !IsPointInPricePanel(point))
                return;

            double price = GetPriceFromPoint(point);

            if (planMode == PlanMode.AwaitEntry)
            {
                entryTime = chartControl.GetTimeByX((int)point.X);
                entryPrice = price;
                ApplyOffsetsFromPanel();
                planMode = PlanMode.Ready;
                UpdatePendingTradeBlueprints();
                UpdateInfoText();
                ForceRefresh();
                e.Handled = true;
                return;
            }

            if (planMode != PlanMode.Ready)
                return;

            dragHandle = HitTest(point);
            if (dragHandle == DragHandle.None)
                return;

            dragStartPrice = price;
            dragStartEntryPrice = entryPrice;
            dragStartStopPrice = stopPrice;
            dragStartTargetPrice = targetPrice;
            Mouse.Capture(chartControl);
            e.Handled = true;
        }

        private void OnChartMouseMove(object sender, MouseEventArgs e)
        {
            if (!IsLicenseCurrentlyValid())
                return;

            RefreshActiveChartContext();
            ChartControl chartControl = sender as ChartControl ?? GetInteractionChartControl();
            if (chartControl == null || planMode != PlanMode.Ready)
                return;

            System.Windows.Point point = e.GetPosition(chartControl);
            bool isDragging = dragHandle != DragHandle.None && e.LeftButton == MouseButtonState.Pressed;
            if (!IsPointInPricePanel(point) && !isDragging)
                return;

            if (IsOverPanel(point) && dragHandle == DragHandle.None)
                return;

            if (isDragging)
                point = ClampPointToPricePanel(point);

            if (!isDragging)
                return;

            double price = GetPriceFromPoint(point);

            if (dragHandle == DragHandle.Entry)
            {
                double delta = price - dragStartPrice;
                entryPrice = RoundToTick(dragStartEntryPrice + delta);
                stopPrice = RoundToTick(dragStartStopPrice + delta);
                targetPrice = RoundToTick(dragStartTargetPrice + delta);
                entryTime = chartControl.GetTimeByX((int)point.X);
                SyncPointValuesFromCurrentPlan();
                UpdatePendingTradeBlueprints();
            }
            else if (dragHandle == DragHandle.Stop)
            {
                stopPrice = ClampStopPrice(price);
                SyncPointValuesFromCurrentPlan();
                UpdatePendingTradeBlueprints();
            }
            else if (dragHandle == DragHandle.Target)
            {
                targetPrice = ClampTargetPrice(price);
                SyncPointValuesFromCurrentPlan();
                UpdatePendingTradeBlueprints();
            }
            else if (dragHandle == DragHandle.ResizeTarget)
            {
                ResizeBoxWidth(point.X);
                targetPrice = ClampTargetPrice(price);
                SyncPointValuesFromCurrentPlan();
                UpdatePendingTradeBlueprints();
            }
            else if (dragHandle == DragHandle.ResizeStop)
            {
                ResizeBoxWidth(point.X);
                stopPrice = ClampStopPrice(price);
                SyncPointValuesFromCurrentPlan();
                UpdatePendingTradeBlueprints();
            }
            else if (dragHandle == DragHandle.Resize)
            {
                ResizeBoxWidth(point.X);
            }

            UpdateInfoText();
            ForceRefresh();
        }

        private void OnChartMouseUp(object sender, MouseButtonEventArgs e)
        {
            RefreshActiveChartContext();
            ChartControl chartControl = sender as ChartControl ?? GetInteractionChartControl();
            bool hadDrag = dragHandle != DragHandle.None;
            dragHandle = DragHandle.None;

            if (Mouse.Captured == chartControl)
                Mouse.Capture(null);

            if (!IsLicenseCurrentlyValid())
                return;

            if (hadDrag && planMode == PlanMode.Ready)
            {
                TrySyncPendingEntryOrder();
                ScheduleLiveExitSync();
            }
        }

        private void ResizeBoxWidth(double pointX)
        {
            ChartControl chartControl = GetInteractionChartControl();
            if (chartControl == null)
                return;

            float leftX = chartControl.GetXByTime(entryTime);
            int newWidth = (int)Math.Round(pointX - leftX);
            int maxWidth = (int)Math.Max(60f, chartControl.CanvasRight - leftX - 80f);
            BoxWidthPixels = Math.Max(60, Math.Min(maxWidth, newWidth));
        }

        private void ScheduleLiveExitSync(bool throttleOnly = false)
        {
            pendingManualExitSync = true;
            suppressLiveSnapshotUntil = Core.Globals.Now.AddMilliseconds(800);

            if (liveExitSyncTimer == null)
            {
                liveExitSyncTimer = new DispatcherTimer
                {
                    Interval = TimeSpan.FromMilliseconds(220)
                };
                liveExitSyncTimer.Tick += OnLiveExitSyncTimerTick;
            }

            if (throttleOnly && liveExitSyncTimer.IsEnabled)
                return;

            liveExitSyncTimer.Stop();
            liveExitSyncTimer.Start();
        }

        private void OnLiveExitSyncTimerTick(object sender, EventArgs e)
        {
            if (liveExitSyncTimer != null)
                liveExitSyncTimer.Stop();

            TrySyncLiveExitOrders();
            suppressLiveSnapshotUntil = Core.Globals.Now.AddMilliseconds(600);
            pendingManualExitSync = false;
        }

        private void MaybeThrottleLiveExitSync()
        {
            Account account = GetSelectedChartAccount();
            Position livePosition = GetLiveInstrumentPosition(account);
            if (livePosition == null || livePosition.MarketPosition == MarketPosition.Flat || livePosition.Quantity <= 0)
                return;

            ScheduleLiveExitSync(true);
        }

        private void EnsureSubscribed(Account account)
        {
            if (account == null || subscribedAccounts.Contains(account))
                return;

            account.ExecutionUpdate += OnExecutionUpdate;
            account.OrderUpdate += OnOrderUpdate;
            subscribedAccounts.Add(account);
        }

        private void OnOrderUpdate(object sender, OrderEventArgs e)
        {
            if (e == null || e.Order == null || ChartControl == null)
                return;

            Account account = sender as Account;
            if (account == null)
                return;
            if (!IsSelectedPanelAccount(account))
                return;

            if (e.Order.OrderState == OrderState.Rejected)
            {
                ChartControl.Dispatcher.InvokeAsync(() => SetInfoText("Order rejected: " + e.Order.Name));
                return;
            }

            if (!IsOrderActive(e.Order))
                return;

            string selectedInstrumentName = GetSelectedTradeInstrumentFullNameSafe();
            string orderInstrumentName = e.Order.Instrument != null ? e.Order.Instrument.FullName : string.Empty;
            if (string.IsNullOrWhiteSpace(selectedInstrumentName) || string.IsNullOrWhiteSpace(orderInstrumentName))
                return;

            if (!string.Equals(orderInstrumentName, selectedInstrumentName, StringComparison.OrdinalIgnoreCase))
                return;

            ChartControl.Dispatcher.InvokeAsync(() => SyncPlanFromLiveOrder(e.Order, account));
        }

        private void OnExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            if (e == null || e.Execution == null || e.Execution.Order == null)
                return;

            Account account = sender as Account;
            if (account == null)
                return;
            if (!IsSelectedPanelAccount(account))
                return;

            string selectedInstrumentFullName = GetSelectedTradeInstrumentFullNameSafe();
            string instrumentFullName = e.Execution.Order.Instrument != null ? e.Execution.Order.Instrument.FullName : string.Empty;
            if (string.IsNullOrWhiteSpace(selectedInstrumentFullName) || string.IsNullOrWhiteSpace(instrumentFullName))
                return;
            if (!string.Equals(instrumentFullName, selectedInstrumentFullName, StringComparison.OrdinalIgnoreCase))
                return;

            bool hasManagedBrackets = HasActiveManagedBrackets(account, instrumentFullName);
            Position livePosition = GetInstrumentPosition(account, instrumentFullName);

            if (livePosition != null && livePosition.MarketPosition != MarketPosition.Flat && livePosition.Quantity > 0)
            {
                if (ChartControl != null)
                {
                    ChartControl.Dispatcher.InvokeAsync(() =>
                    {
                        if (hasManagedBrackets)
                            ApplyLivePositionEntryOnly(livePosition);
                        else
                            ApplyLivePositionToPlan(livePosition);

                        ScheduleLiveExitSync();
                    });
                }
            }
            else if (ChartControl != null && !IsEntryLikeOrder(e.Execution.Order))
            {
                ChartControl.Dispatcher.InvokeAsync(() =>
                {
                    CancelFlatInstrumentOrders(account, instrumentFullName);
                    RemovePendingTradesForInstrument(account, instrumentFullName);
                    ResetPlan();
                });
            }

            PendingTrade pending = pendingTrades.Values.FirstOrDefault(t =>
                t.Account == account &&
                t.Instrument != null &&
                string.Equals(t.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase) &&
                (string.Equals(t.EntryOrderId, e.Execution.Order.OrderId, StringComparison.Ordinal) ||
                 string.Equals(t.EntryOrderName, e.Execution.Order.Name, StringComparison.Ordinal)));

            if (pending == null || pending.ExitSubmitted)
                return;

            int filledQty = e.Execution.Order.Filled;
            if (filledQty < 1)
                return;

            if (HasActiveManagedBrackets(account, instrumentFullName))
            {
                pending.ExitSubmitted = true;
                if (ChartControl != null)
                {
                    ChartControl.Dispatcher.InvokeAsync(() =>
                    {
                        Position currentPosition = GetInstrumentPosition(account, instrumentFullName);
                        if (currentPosition != null)
                            ApplyLivePositionEntryOnly(currentPosition);

                        TrySyncLiveExitOrders();
                    });
                }
                return;
            }

            double actualEntry = e.Execution.Order.AverageFillPrice > 0 ? e.Execution.Order.AverageFillPrice : e.Execution.Price;
            actualEntry = RoundToTick(actualEntry);

            double stopPriceToUse = pending.StopPrice;
            double targetPriceToUse = pending.TargetPrice;

            if (pending.AlignToFillPrice && actualEntry > 0)
            {
                double stopOffset = pending.StopPrice - pending.PlannedEntryPrice;
                double targetOffset = pending.TargetPrice - pending.PlannedEntryPrice;
                stopPriceToUse = RoundToTick(actualEntry + stopOffset);
                targetPriceToUse = RoundToTick(actualEntry + targetOffset);
            }

            Order stopOrder = pending.Account.CreateOrder(
                pending.Instrument,
                pending.ExitAction,
                OrderType.StopMarket,
                OrderEntry.Manual,
                TimeInForce.Day,
                filledQty,
                0,
                stopPriceToUse,
                pending.OcoId,
                "RRPANEL_STOP",
                Core.Globals.MaxDate,
                null);

            Order targetOrder = pending.Account.CreateOrder(
                pending.Instrument,
                pending.ExitAction,
                OrderType.Limit,
                OrderEntry.Manual,
                TimeInForce.Day,
                filledQty,
                targetPriceToUse,
                0,
                pending.OcoId,
                "RRPANEL_TARGET",
                Core.Globals.MaxDate,
                null);

            pending.Account.Submit(new[] { stopOrder, targetOrder });
            pending.StopOrder = stopOrder;
            pending.TargetOrder = targetOrder;
            pending.ExitSubmitted = true;
        }

        private Order BuildEntryOrder(Account account, Instrument selectedInstrument, OrderAction entryAction, int quantity, double desiredPrice, bool useWorkingPrice, string orderName)
        {
            if (account == null || selectedInstrument == null)
                return null;

            if (!useWorkingPrice)
            {
                return account.CreateOrder(
                    selectedInstrument,
                    entryAction,
                    OrderType.Market,
                    OrderEntry.Manual,
                    TimeInForce.Day,
                    quantity,
                    0,
                    0,
                    string.Empty,
                    orderName,
                    Core.Globals.MaxDate,
                    null);
            }

            double referencePrice = GetSelectedInstrumentPrice(entryAction == OrderAction.Buy ? PriceReferenceMode.LongEntry : PriceReferenceMode.ShortEntry);
            double tick = selectedInstrument.MasterInstrument.TickSize;
            double entry = selectedInstrument.MasterInstrument.RoundToTickSize(desiredPrice);

            bool useStopMarket = ShouldUseStopEntry(entryAction, entry, referencePrice, tick);

            return account.CreateOrder(
                selectedInstrument,
                entryAction,
                useStopMarket ? OrderType.StopMarket : OrderType.Limit,
                OrderEntry.Manual,
                TimeInForce.Day,
                quantity,
                useStopMarket ? 0 : entry,
                useStopMarket ? entry : 0,
                string.Empty,
                orderName,
                Core.Globals.MaxDate,
                null);
        }

        private bool ShouldUseStopEntry(OrderAction entryAction, double desiredPrice, double referencePrice, double tick)
        {
            if (referencePrice <= 0)
                return false;

            return
                (entryAction == OrderAction.Buy && desiredPrice >= referencePrice + tick) ||
                (entryAction == OrderAction.SellShort && desiredPrice <= referencePrice - tick);
        }

        private void TrySyncPendingEntryOrder()
        {
            if (!IsLicenseCurrentlyValid())
                return;

            try
            {
                Account account = GetSelectedChartAccount();
                Instrument instrument = GetSelectedTradeInstrument();
                if (account == null || instrument == null)
                    return;

                Position livePosition = GetLiveInstrumentPosition(account);
                if (livePosition != null && livePosition.MarketPosition != MarketPosition.Flat && livePosition.Quantity > 0)
                    return;

                List<Order> entryOrders = GetActiveManagedEntryOrders(account, instrument.FullName);
                if (entryOrders.Count == 0)
                    return;
                if (entryOrders.Any(IsOrderSyncTransient))
                    return;

                Order primary = entryOrders[0];
                if (entryOrders.Count > 1)
                {
                    try
                    {
                        Order[] duplicateOrders = entryOrders.Skip(1).Where(o => !IsOrderSyncTransient(o)).ToArray();
                        if (duplicateOrders.Length > 0)
                            account.Cancel(duplicateOrders);
                    }
                    catch
                    {
                    }
                }

                double newEntryPrice = RoundToTick(entryPrice);
                double tick = instrument.MasterInstrument.TickSize;
                double referencePrice = GetSelectedInstrumentPrice(selectedSide == TradeSide.Short ? PriceReferenceMode.ShortEntry : PriceReferenceMode.LongEntry);

                bool desiredStop = ShouldUseStopEntry(primary.OrderAction, newEntryPrice, referencePrice, tick);
                bool currentStop = primary.OrderType == OrderType.StopMarket || primary.OrderType == OrderType.StopLimit || primary.StopPrice > 0;
                bool currentLimit = primary.OrderType == OrderType.Limit || primary.LimitPrice > 0;

                if ((desiredStop && !currentStop) || (!desiredStop && !currentLimit))
                {
                    int quantity = primary.Quantity;
                    string orderName = string.IsNullOrWhiteSpace(primary.Name) ? "RRPANEL_ENTRY" : primary.Name;

                    try
                    {
                        account.Cancel(new[] { primary });
                    }
                    catch
                    {
                    }

                    Order replacement = BuildEntryOrder(account, instrument, primary.OrderAction, quantity, newEntryPrice, true, orderName);
                    if (replacement != null)
                    {
                        account.Submit(new[] { replacement });
                        foreach (PendingTrade trade in pendingTrades.Values)
                        {
                            if (trade.Account != account || trade.Instrument == null)
                                continue;
                            if (!string.Equals(trade.Instrument.FullName, instrument.FullName, StringComparison.OrdinalIgnoreCase))
                                continue;
                            if (trade.ExitSubmitted)
                                continue;

                            trade.EntryOrderId = replacement.OrderId;
                            trade.EntryOrderName = replacement.Name;
                        }
                    }

                    UpdatePendingTradeBlueprints();
                    return;
                }

                if (currentStop)
                {
                    if (Math.Abs(primary.StopPrice - newEntryPrice) >= tick * 0.5)
                    {
                        primary.StopPriceChanged = newEntryPrice;
                        account.Change(new[] { primary });
                    }
                }
                else
                {
                    if (Math.Abs(primary.LimitPrice - newEntryPrice) >= tick * 0.5)
                    {
                        primary.LimitPriceChanged = newEntryPrice;
                        account.Change(new[] { primary });
                    }
                }

                UpdatePendingTradeBlueprints();
            }
            catch
            {
            }
        }

        private void UpdatePendingTradeBlueprints()
        {
            Account account = GetSelectedChartAccount();
            Instrument instrument = GetSelectedTradeInstrument();
            if (account == null || instrument == null)
                return;

            double roundedEntry = RoundToTick(entryPrice);
            double roundedStop = RoundToTick(stopPrice);
            double roundedTarget = RoundToTick(targetPrice);

            foreach (PendingTrade trade in pendingTrades.Values)
            {
                if (trade.Account != account || trade.Instrument == null)
                    continue;
                if (!string.Equals(trade.Instrument.FullName, instrument.FullName, StringComparison.OrdinalIgnoreCase))
                    continue;
                if (trade.ExitSubmitted)
                    continue;

                trade.PlannedEntryPrice = roundedEntry;
                trade.StopPrice = roundedStop;
                trade.TargetPrice = roundedTarget;
                trade.IsLong = selectedSide == TradeSide.Long;
            }
        }

        private List<Order> GetActiveManagedEntryOrders(Account account, string instrumentFullName)
        {
            List<Order> entryOrders = new List<Order>();
            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return entryOrders;

            foreach (Order order in account.Orders)
            {
                if (order == null || order.Instrument == null)
                    continue;
                if (!IsOrderActive(order))
                    continue;
                if (!string.Equals(order.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                    continue;
                if (!IsManagedEntryOrder(order))
                    continue;

                entryOrders.Add(order);
            }

            return entryOrders;
        }

        private bool HasActiveManagedBrackets(Account account, string instrumentFullName)
        {
            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return false;

            foreach (Order order in account.Orders)
            {
                if (order == null || order.Instrument == null)
                    continue;
                if (!IsOrderActive(order))
                    continue;
                if (!string.Equals(order.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (string.Equals(order.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(order.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        private bool HasPendingManagedEntry(Account account, string instrumentFullName)
        {
            return GetActiveManagedEntryOrders(account, instrumentFullName).Count > 0;
        }

        private void TrySyncLiveExitOrders()
        {
            if (!IsLicenseCurrentlyValid())
                return;

            try
            {
                ResolvedPlan resolved;
                Instrument selectedInstrument = GetSelectedTradeInstrument();
                Account account = GetSelectedChartAccount();
                if (selectedInstrument == null || account == null || !TryBuildResolvedPlan(out resolved))
                    return;

                Position livePosition = GetLiveInstrumentPosition(account);
                if (livePosition == null || livePosition.MarketPosition == MarketPosition.Flat || livePosition.Quantity <= 0)
                    return;

                string instrumentFullName = selectedInstrument.FullName;
                List<Order> stopOrders = new List<Order>();
                List<Order> targetOrders = new List<Order>();

                foreach (Order order in account.Orders)
                {
                    if (order == null || order.Instrument == null)
                        continue;
                    if (!IsOrderActive(order))
                        continue;
                    if (!string.Equals(order.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                        continue;

                    if (string.Equals(order.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase))
                        stopOrders.Add(order);
                    else if (string.Equals(order.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase))
                        targetOrders.Add(order);
                }

                Order primaryStop = stopOrders.Count > 0 ? stopOrders[0] : null;
                Order primaryTarget = targetOrders.Count > 0 ? targetOrders[0] : null;
                if (stopOrders.Any(IsOrderSyncTransient) || targetOrders.Any(IsOrderSyncTransient))
                    return;

                if (stopOrders.Count > 1)
                {
                    try
                    {
                        Order[] duplicateStopOrders = stopOrders.Skip(1).Where(o => !IsOrderSyncTransient(o)).ToArray();
                        if (duplicateStopOrders.Length > 0)
                            account.Cancel(duplicateStopOrders);
                    }
                    catch
                    {
                    }
                }

                if (targetOrders.Count > 1)
                {
                    try
                    {
                        Order[] duplicateTargetOrders = targetOrders.Skip(1).Where(o => !IsOrderSyncTransient(o)).ToArray();
                        if (duplicateTargetOrders.Length > 0)
                            account.Cancel(duplicateTargetOrders);
                    }
                    catch
                    {
                    }
                }

                List<Order> ordersToChange = new List<Order>();
                if (primaryStop != null)
                {
                    primaryStop.StopPriceChanged = resolved.StopPrice;
                    primaryStop.QuantityChanged = livePosition.Quantity;
                    ordersToChange.Add(primaryStop);
                }

                if (primaryTarget != null)
                {
                    primaryTarget.LimitPriceChanged = resolved.TargetPrice;
                    primaryTarget.QuantityChanged = livePosition.Quantity;
                    ordersToChange.Add(primaryTarget);
                }

                if (ordersToChange.Count > 0)
                    account.Change(ordersToChange.ToArray());

                string syncKey = BuildManagedExitSyncKey(account, instrumentFullName);
                bool missingStop = primaryStop == null;
                bool missingTarget = primaryTarget == null;

                if (!missingStop && !missingTarget)
                {
                    missingManagedExitSyncCounts.Remove(syncKey);
                }
                else
                {
                    int missingCount;
                    if (!missingManagedExitSyncCounts.TryGetValue(syncKey, out missingCount))
                        missingCount = 0;

                    missingCount++;
                    missingManagedExitSyncCounts[syncKey] = missingCount;

                    if (missingCount <= 1)
                        return;
                }

                List<Order> newOrders = new List<Order>();
                OrderAction exitAction = livePosition.MarketPosition == MarketPosition.Long ? OrderAction.Sell : OrderAction.BuyToCover;
                string ocoId = Guid.NewGuid().ToString("N");

                if (primaryStop == null)
                {
                    newOrders.Add(account.CreateOrder(
                        selectedInstrument,
                        exitAction,
                        OrderType.StopMarket,
                        OrderEntry.Manual,
                        TimeInForce.Day,
                        livePosition.Quantity,
                        0,
                        resolved.StopPrice,
                        ocoId,
                        "RRPANEL_STOP",
                        Core.Globals.MaxDate,
                        null));
                }

                if (primaryTarget == null)
                {
                    newOrders.Add(account.CreateOrder(
                        selectedInstrument,
                        exitAction,
                        OrderType.Limit,
                        OrderEntry.Manual,
                        TimeInForce.Day,
                        livePosition.Quantity,
                        resolved.TargetPrice,
                        0,
                        ocoId,
                        "RRPANEL_TARGET",
                        Core.Globals.MaxDate,
                        null));
                }

                if (newOrders.Count > 0)
                {
                    account.Submit(newOrders.ToArray());
                    missingManagedExitSyncCounts.Remove(syncKey);
                }
            }
            catch
            {
            }
        }

        private void SyncPlanFromLiveOrder(Order order, Account account)
        {
            if (order == null || account == null || planMode == PlanMode.Idle)
                return;

            double updatedPrice = GetWorkingOrderPrice(order);
            if (updatedPrice <= 0)
                return;

            double tickSize = GetPointStep();
            bool changed = false;

            if (string.Equals(order.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase))
            {
                if (Math.Abs(stopPrice - updatedPrice) >= tickSize * 0.5)
                {
                    stopPrice = RoundToTick(updatedPrice);
                    changed = true;
                }
            }
            else if (string.Equals(order.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase))
            {
                if (Math.Abs(targetPrice - updatedPrice) >= tickSize * 0.5)
                {
                    targetPrice = RoundToTick(updatedPrice);
                    changed = true;
                }
            }
            else if (IsManagedEntryOrder(order))
            {
                if (Math.Abs(entryPrice - updatedPrice) >= tickSize * 0.5)
                {
                    double delta = updatedPrice - entryPrice;
                    entryPrice = RoundToTick(updatedPrice);
                    stopPrice = RoundToTick(stopPrice + delta);
                    targetPrice = RoundToTick(targetPrice + delta);
                    changed = true;
                }
            }

            if (!changed)
                return;

            SyncPointValuesFromCurrentPlan();
            UpdatePendingTradeBlueprints();
            UpdateInfoText();
            ForceRefresh();
        }

        private void SyncPlanFromLiveOrdersSnapshot()
        {
            try
            {
                if (!uiInstalled)
                    return;

                Account account = GetSelectedChartAccount();
                Position livePosition = GetLiveInstrumentPosition(account);
                if (account == null || livePosition == null || livePosition.MarketPosition == MarketPosition.Flat || livePosition.Quantity <= 0)
                    return;

                Instrument selectedInstrument = GetSelectedTradeInstrument();
                if (selectedInstrument == null)
                    return;

                string instrumentFullName = selectedInstrument.FullName;
                Order liveStop = null;
                Order liveTarget = null;

                foreach (Order order in account.Orders)
                {
                    if (order == null || order.Instrument == null)
                        continue;
                    if (!string.Equals(order.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                        continue;
                    if (!IsOrderActive(order))
                        continue;

                    if (string.Equals(order.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase))
                        liveStop = order;
                    else if (string.Equals(order.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase))
                        liveTarget = order;
                }

                bool changed = false;
                double tickSize = selectedInstrument.MasterInstrument.TickSize;
                selectedSide = livePosition.MarketPosition == MarketPosition.Long ? TradeSide.Long : TradeSide.Short;
                EnsureEntryTimeVisible();

                double liveEntryPrice = RoundToTick(livePosition.AveragePrice);
                if (planMode == PlanMode.Idle)
                {
                    entryPrice = liveEntryPrice;

                    if (liveStop != null)
                        stopPrice = RoundToTick(GetWorkingOrderPrice(liveStop));
                    if (liveTarget != null)
                        targetPrice = RoundToTick(GetWorkingOrderPrice(liveTarget));

                    if (stopPrice <= 0 || targetPrice <= 0)
                        ApplyOffsetsFromPanel();

                    planMode = PlanMode.Ready;
                    changed = true;
                }

                if (Math.Abs(entryPrice - liveEntryPrice) >= tickSize * 0.5)
                {
                    entryPrice = liveEntryPrice;
                    changed = true;
                }

                if (liveStop != null)
                {
                    double liveStopPrice = RoundToTick(GetWorkingOrderPrice(liveStop));
                    if (liveStopPrice > 0 && Math.Abs(stopPrice - liveStopPrice) >= tickSize * 0.5)
                    {
                        stopPrice = liveStopPrice;
                        changed = true;
                    }
                }

                if (liveTarget != null)
                {
                    double liveTargetPrice = RoundToTick(GetWorkingOrderPrice(liveTarget));
                    if (liveTargetPrice > 0 && Math.Abs(targetPrice - liveTargetPrice) >= tickSize * 0.5)
                    {
                        targetPrice = liveTargetPrice;
                        changed = true;
                    }
                }

                if (!changed)
                    return;

                SyncPointValuesFromCurrentPlan();
                UpdateInfoText();
                ForceRefresh();
            }
            catch
            {
            }
        }

        private void SyncPlanFromPendingEntrySnapshot()
        {
            try
            {
                Account account = GetSelectedChartAccount();
                Instrument instrument = GetSelectedTradeInstrument();
                if (account == null || instrument == null)
                    return;

                Position livePosition = GetLiveInstrumentPosition(account);
                if (livePosition != null && livePosition.MarketPosition != MarketPosition.Flat && livePosition.Quantity > 0)
                    return;

                List<Order> entryOrders = GetActiveManagedEntryOrders(account, instrument.FullName);
                if (entryOrders.Count == 0)
                    return;

                if (entryOrders.Count > 1)
                {
                    try
                    {
                        account.Cancel(entryOrders.Skip(1).ToArray());
                    }
                    catch
                    {
                    }
                }

                Order entryOrder = entryOrders[0];
                double orderPrice = RoundToTick(GetWorkingOrderPrice(entryOrder));
                if (orderPrice <= 0)
                    return;

                TradeSide newSide = entryOrder.OrderAction == OrderAction.SellShort ? TradeSide.Short : TradeSide.Long;
                double tick = instrument.MasterInstrument.TickSize;
                bool hadPlan = planMode == PlanMode.Ready && entryTime != default(DateTime) && selectedSide == newSide;
                PendingTrade blueprint = pendingTrades.Values.FirstOrDefault(t =>
                    t.Account == account &&
                    t.Instrument != null &&
                    string.Equals(t.Instrument.FullName, instrument.FullName, StringComparison.OrdinalIgnoreCase) &&
                    !t.ExitSubmitted);

                selectedSide = newSide;
                EnsureEntryTimeVisible();

                if (!hadPlan)
                {
                    entryPrice = orderPrice;
                    if (blueprint != null)
                    {
                        stopPrice = RoundToTick(blueprint.StopPrice);
                        targetPrice = RoundToTick(blueprint.TargetPrice);
                    }
                    else
                    {
                        ApplyOffsetsFromPanel();
                    }

                    planMode = PlanMode.Ready;
                    SyncPointValuesFromCurrentPlan();
                    UpdateInfoText();
                    ForceRefresh();
                    return;
                }

                if (Math.Abs(entryPrice - orderPrice) >= tick * 0.5)
                {
                    double delta = orderPrice - entryPrice;
                    entryPrice = orderPrice;

                    if (blueprint != null)
                    {
                        stopPrice = RoundToTick(blueprint.StopPrice);
                        targetPrice = RoundToTick(blueprint.TargetPrice);
                    }
                    else
                    {
                        stopPrice = RoundToTick(stopPrice + delta);
                        targetPrice = RoundToTick(targetPrice + delta);
                    }

                    SyncPointValuesFromCurrentPlan();
                    UpdateInfoText();
                    ForceRefresh();
                }
            }
            catch
            {
            }
        }

        private void CleanupManagedStateIfFlat()
        {
            try
            {
                Account account = GetSelectedChartAccount();
                Instrument instrument = GetSelectedTradeInstrument();
                if (account == null || instrument == null)
                    return;

                Position livePosition = GetLiveInstrumentPosition(account);
                if (livePosition != null && livePosition.MarketPosition != MarketPosition.Flat && livePosition.Quantity > 0)
                    return;

                string instrumentFullName = instrument.FullName;
                bool hasPendingEntry = HasPendingManagedEntry(account, instrumentFullName);
                if (hasPendingEntry)
                    return;

                bool hasManagedBrackets = HasActiveManagedBrackets(account, instrumentFullName);
                bool hadPendingBlueprint = HasPendingTradeBlueprint(account, instrumentFullName);

                if (hasManagedBrackets)
                    CancelLiveBracketOrders(account);

                RemovePendingTradesForInstrument(account, instrumentFullName);

                if ((hasManagedBrackets || hadPendingBlueprint) && planMode != PlanMode.AwaitEntry)
                    ResetPlan();
            }
            catch
            {
            }
        }

        private void CancelLiveBracketOrders(Account account)
        {
            try
            {
                string instrumentFullName = GetSelectedTradeInstrumentFullName();
                if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                    return;

                Order[] bracketOrders = account.Orders
                    .Where(o =>
                        o != null &&
                        o.Instrument != null &&
                        string.Equals(o.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase) &&
                        (string.Equals(o.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(o.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase)) &&
                        IsOrderActive(o) &&
                        !IsOrderSyncTransient(o))
                    .ToArray();

                if (bracketOrders.Length > 0)
                    account.Cancel(bracketOrders);
            }
            catch
            {
            }
        }

        private Order[] GetActiveCloseBlockingOrders(Account account, string instrumentFullName)
        {
            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return new Order[0];

            return account.Orders
                .Where(o =>
                    o != null &&
                    o.Instrument != null &&
                    string.Equals(o.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase) &&
                    IsOrderActive(o) &&
                    o.OrderType != OrderType.Market)
                .ToArray();
        }

        private Order[] GetActiveManagedOrders(Account account, string instrumentFullName)
        {
            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return new Order[0];

            return account.Orders
                .Where(o =>
                    o != null &&
                    o.Instrument != null &&
                    string.Equals(o.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase) &&
                    IsOrderActive(o) &&
                    (IsManagedEntryOrder(o) ||
                     string.Equals(o.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(o.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase) ||
                     (o.Name ?? string.Empty).StartsWith("RRPANEL_", StringComparison.OrdinalIgnoreCase)))
                .ToArray();
        }

        private void RemovePendingTradesForInstrument(Account account, string instrumentFullName)
        {
            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return;

            List<string> keysToRemove = pendingTrades
                .Where(kvp =>
                    kvp.Value != null &&
                    kvp.Value.Account == account &&
                    kvp.Value.Instrument != null &&
                    string.Equals(kvp.Value.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (string key in keysToRemove)
                pendingTrades.Remove(key);

            missingManagedExitSyncCounts.Remove(BuildManagedExitSyncKey(account, instrumentFullName));
        }

        private void ApplyLivePositionToPlan(Position livePosition)
        {
            if (livePosition == null)
                return;

            selectedSide = livePosition.MarketPosition == MarketPosition.Long ? TradeSide.Long : TradeSide.Short;
            entryPrice = RoundToTick(livePosition.AveragePrice);
            EnsureEntryTimeVisible();

            ApplyOffsetsFromPanel();
            planMode = PlanMode.Ready;
            UpdateInfoText();
            ForceRefresh();
        }

        private void ApplyLivePositionEntryOnly(Position livePosition)
        {
            if (livePosition == null)
                return;

            selectedSide = livePosition.MarketPosition == MarketPosition.Long ? TradeSide.Long : TradeSide.Short;
            entryPrice = RoundToTick(livePosition.AveragePrice);

            Order liveStop = null;
            Order liveTarget = null;
            try
            {
                Account account = GetSelectedChartAccount();
                Instrument instrument = GetSelectedTradeInstrument();
                if (account != null && instrument != null)
                {
                    foreach (Order order in account.Orders)
                    {
                        if (order == null || order.Instrument == null)
                            continue;
                        if (!IsOrderActive(order))
                            continue;
                        if (!string.Equals(order.Instrument.FullName, instrument.FullName, StringComparison.OrdinalIgnoreCase))
                            continue;

                        if (string.Equals(order.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase))
                            liveStop = order;
                        else if (string.Equals(order.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase))
                            liveTarget = order;
                    }
                }
            }
            catch
            {
            }

            if (liveStop != null)
                stopPrice = RoundToTick(GetWorkingOrderPrice(liveStop));
            if (liveTarget != null)
                targetPrice = RoundToTick(GetWorkingOrderPrice(liveTarget));

            if (stopPrice <= 0 || targetPrice <= 0)
                ApplyOffsetsFromPanel();

            EnsureEntryTimeVisible();

            planMode = PlanMode.Ready;
            SyncPointValuesFromCurrentPlan();
            UpdateInfoText();
            ForceRefresh();
        }

        private void ResetPlan()
        {
            planMode = PlanMode.Idle;
            dragHandle = DragHandle.None;
            selectedSide = TradeSide.None;
            entryTime = default(DateTime);
            entryPrice = 0;
            stopPrice = 0;
            targetPrice = 0;
            dragStartPrice = 0;
            dragStartEntryPrice = 0;
            dragStartStopPrice = 0;
            dragStartTargetPrice = 0;

            SetInfoText("Press Long or Short, then click Entry on this chart.");
            RefreshPointControls();
            ForceRefresh();
        }

        private void ReapplyOffsetsIfReady()
        {
            if (planMode != PlanMode.Ready || selectedSide == TradeSide.None || entryTime == default(DateTime))
                return;

            ApplyOffsetsFromPanel();
            UpdatePendingTradeBlueprints();
            UpdateInfoText();
            TrySyncPendingEntryOrder();
            ScheduleLiveExitSync();
            ForceRefresh();
        }

        private void ApplyOffsetsFromPanel()
        {
            double step = GetPointStep();
            double tpPoints = NormalizePointValue(Math.Max(step, tpPointsValue));
            double slPoints = NormalizePointValue(Math.Max(step, slPointsValue));

            if (selectedSide == TradeSide.Long)
            {
                targetPrice = RoundToTick(entryPrice + tpPoints);
                stopPrice = RoundToTick(entryPrice - slPoints);
            }
            else if (selectedSide == TradeSide.Short)
            {
                targetPrice = RoundToTick(entryPrice - tpPoints);
                stopPrice = RoundToTick(entryPrice + slPoints);
            }
        }

        private void UpdateInfoText()
        {
            if (infoText == null)
                return;

            ResolvedPlan resolved;
            TradeMetrics metrics;
            bool isLong;

            if (!TryBuildResolvedPlan(out resolved) || !TryGetMetrics(out metrics, out isLong))
            {
                SetInfoText((selectedSide == TradeSide.Short ? "SHORT" : selectedSide == TradeSide.Long ? "LONG" : "NONE") +
                    Environment.NewLine +
                    "Entry: " + RoundToTick(entryPrice).ToString("0.00") +
                    Environment.NewLine +
                    "Stop: " + RoundToTick(stopPrice).ToString("0.00") +
                    Environment.NewLine +
                    "Target: " + RoundToTick(targetPrice).ToString("0.00"));
                return;
            }

            int quantity = GetLiveOrPlannedQuantity();

            string stopLabel = metrics.StopLocksProfit ? "Locked" : "Risk";
            string stopDollarsText = (metrics.StopDollars(quantity) >= 0 ? "+$" : "-$") + Math.Abs(metrics.StopDollars(quantity)).ToString("0");

            SetInfoText((isLong ? "LONG" : "SHORT") +
                Environment.NewLine +
                "Entry: " + resolved.EntryPrice.ToString("0.00") +
                Environment.NewLine +
                "Stop: " + resolved.StopPrice.ToString("0.00") +
                Environment.NewLine +
                "Target: " + resolved.TargetPrice.ToString("0.00") +
                Environment.NewLine +
                stopLabel + ": " + metrics.RiskPoints.ToString("0.00") + " pts | " + stopDollarsText +
                Environment.NewLine +
                "Reward: " + metrics.RewardPoints.ToString("0.00") + " pts | $" + metrics.RewardDollars(quantity).ToString("0") +
                Environment.NewLine +
                "RR: 1:" + metrics.Ratio.ToString("0.00") +
                Environment.NewLine +
                "Qty: " + quantity);
        }

        private void SetInfoText(string text)
        {
            if (infoText != null)
            {
                if (!licenseIsValid && !string.IsNullOrWhiteSpace(licenseStatusMessage))
                {
                    infoText.Text = string.IsNullOrWhiteSpace(text) || string.Equals(text.Trim(), licenseStatusMessage, StringComparison.Ordinal)
                        ? licenseStatusMessage
                        : text + Environment.NewLine + Environment.NewLine + licenseStatusMessage;
                }
                else
                    infoText.Text = text;
            }
        }

        private bool TryBuildResolvedPlan(out ResolvedPlan resolved)
        {
            resolved = default(ResolvedPlan);

            Instrument selectedInstrument = GetSelectedTradeInstrument();
            if (selectedInstrument == null || entryTime == default(DateTime) || selectedSide == TradeSide.None)
                return false;

            double tick = selectedInstrument.MasterInstrument.TickSize;
            double entry = RoundToTick(entryPrice);
            double stop = RoundToTick(stopPrice);
            double target = RoundToTick(targetPrice);

            if (Math.Abs(entry - stop) < tick || Math.Abs(entry - target) < tick)
                return false;

            bool isLong = selectedSide == TradeSide.Long && target > entry && stop < target;
            bool isShort = selectedSide == TradeSide.Short && target < entry && stop > target;

            if (!isLong && !isShort)
                return false;

            resolved = new ResolvedPlan
            {
                EntryPrice = entry,
                StopPrice = stop,
                TargetPrice = target,
                IsLong = isLong
            };

            return true;
        }

        private bool TryGetMetrics(out TradeMetrics metrics, out bool isLong)
        {
            metrics = default(TradeMetrics);
            isLong = false;

            Instrument selectedInstrument = GetSelectedTradeInstrument();
            ResolvedPlan resolved;
            if (selectedInstrument == null || !TryBuildResolvedPlan(out resolved))
                return false;

            double tickSize = selectedInstrument.MasterInstrument.TickSize;
            double pointValue = selectedInstrument.MasterInstrument.PointValue;
            double riskPoints = Math.Abs(resolved.EntryPrice - resolved.StopPrice);
            double rewardPoints = Math.Abs(resolved.TargetPrice - resolved.EntryPrice);
            double stopOffsetPoints = resolved.IsLong
                ? resolved.StopPrice - resolved.EntryPrice
                : resolved.EntryPrice - resolved.StopPrice;

            if (riskPoints <= 0 || rewardPoints <= 0)
                return false;

            isLong = resolved.IsLong;
            metrics = new TradeMetrics
            {
                RiskPoints = riskPoints,
                RewardPoints = rewardPoints,
                RiskTicks = riskPoints / tickSize,
                RewardTicks = rewardPoints / tickSize,
                DollarsPerContract = riskPoints * pointValue,
                RewardDollarsPerContract = rewardPoints * pointValue,
                Ratio = rewardPoints / riskPoints,
                StopOffsetPoints = stopOffsetPoints,
                StopOffsetDollarsPerContract = stopOffsetPoints * pointValue
            };

            return true;
        }

        private void RefreshPointControls()
        {
            Instrument selectedInstrument = GetSelectedTradeInstrument();
            double pointValue = selectedInstrument != null && selectedInstrument.MasterInstrument != null
                ? selectedInstrument.MasterInstrument.PointValue
                : 1;
            int quantity = GetLiveOrPlannedQuantity();

            if (tpPointsValueText != null)
                tpPointsValueText.Text = tpPointsValue.ToString("0.##");
            if (slPointsValueText != null)
                slPointsValueText.Text = slPointsValue.ToString("0.##");
            if (tpDollarsValueText != null)
                tpDollarsValueText.Text = "$" + (tpPointsValue * pointValue * Math.Max(1, quantity)).ToString("0");
            if (slDollarsValueText != null)
                slDollarsValueText.Text = "-$" + (slPointsValue * pointValue * Math.Max(1, quantity)).ToString("0");
        }

        private void RefreshLivePnlDisplay()
        {
            if (pnlLiveText == null)
                return;

            if (pnlCollapsed)
            {
                pnlLiveText.Text = "PnL : hidden";
                pnlLiveText.Foreground = Brushes.Gainsboro;
                return;
            }

            Account account = GetSelectedChartAccount();
            Position livePosition = GetLiveInstrumentPosition(account);
            if (account == null || livePosition == null || livePosition.MarketPosition == MarketPosition.Flat || livePosition.Quantity <= 0)
            {
                pnlLiveText.Text = "PnL : Flat";
                pnlLiveText.Foreground = Brushes.Gainsboro;
                return;
            }

            double markPrice = GetSelectedInstrumentPrice(
                livePosition.MarketPosition == MarketPosition.Long ? PriceReferenceMode.LongExit : PriceReferenceMode.ShortExit);

            if (markPrice <= 0)
            {
                pnlLiveText.Text = "PnL : Waiting for price...";
                pnlLiveText.Foreground = Brushes.Gainsboro;
                return;
            }

            double pnlPoints = livePosition.GetUnrealizedProfitLoss(PerformanceUnit.Points, markPrice);
            double pnlCurrency = livePosition.GetUnrealizedProfitLoss(PerformanceUnit.Currency, markPrice);

            pnlLiveText.Text = "PnL : " +
                (pnlPoints >= 0 ? "+" : string.Empty) + pnlPoints.ToString("0.00") +
                "  |  " +
                (pnlCurrency >= 0 ? "+" : "-") + "$" + Math.Abs(pnlCurrency).ToString("0.00");

            pnlLiveText.Foreground =
                pnlCurrency > 0
                    ? new WpfSolidColorBrush(WpfColor.FromRgb(120, 255, 120))
                    : pnlCurrency < 0
                        ? Brushes.OrangeRed
                        : Brushes.Gainsboro;
        }

        private void RefreshRrPanelText()
        {
            if (rrPanelText == null)
                return;

            TradeMetrics metrics;
            bool isLong;
            if (planMode != PlanMode.Idle && TryGetMetrics(out metrics, out isLong))
            {
                rrPanelText.Text = "RR 1:" + metrics.Ratio.ToString("0.00");
                rrPanelText.Visibility = Visibility.Visible;
                return;
            }

            rrPanelText.Text = string.Empty;
            rrPanelText.Visibility = Visibility.Collapsed;
        }

        private bool IsCurrentChartVisible()
        {
            if (hostWindow != null && !hostWindow.IsVisible)
                return false;

            ChartControl visibleChartControl = activeChartControl;
            if (visibleChartControl == null && hostWindow != null)
                visibleChartControl = FindVisibleElementByType<ChartControl>(hostWindow);

            FrameworkElement chartElement = visibleChartControl as FrameworkElement ?? ChartControl as FrameworkElement;
            if (chartElement != null && (!chartElement.IsVisible || chartElement.ActualWidth <= 0 || chartElement.ActualHeight <= 0))
                return false;

            if (chartGrid != null && !chartGrid.IsVisible)
                return false;

            return ChartControl != null;
        }

        private void SyncPointValuesFromCurrentPlan()
        {
            ResolvedPlan resolved;
            if (!TryBuildResolvedPlan(out resolved))
                return;

            double rewardPoints = Math.Abs(resolved.TargetPrice - resolved.EntryPrice);
            double riskPoints = Math.Abs(resolved.EntryPrice - resolved.StopPrice);

            tpPointsValue = NormalizePointValue(rewardPoints);
            slPointsValue = NormalizePointValue(riskPoints);
            RefreshPointControls();
        }

        private DragHandle HitTest(System.Windows.Point point)
        {
            ChartControl chartControl = GetInteractionChartControl();
            if (chartControl == null)
                return DragHandle.None;

            ChartScale scale = GetPriceScale();
            if (scale == null)
                return DragHandle.None;

            double entryY = scale.GetYByValue(entryPrice);
            double stopY = scale.GetYByValue(stopPrice);
            double targetY = scale.GetYByValue(targetPrice);
            double leftX = chartControl.GetXByTime(entryTime);
            double rightX = Math.Min(leftX + BoxWidthPixels, chartControl.CanvasRight - 80f);
            double topY = Math.Min(targetY, stopY);
            double bottomY = Math.Max(targetY, stopY);
            double lineTolerance = 12d;
            double cornerTolerance = 14d;

            if (Math.Abs(point.X - rightX) <= cornerTolerance && Math.Abs(point.Y - targetY) <= cornerTolerance)
                return DragHandle.ResizeTarget;
            if (Math.Abs(point.X - rightX) <= cornerTolerance && Math.Abs(point.Y - stopY) <= cornerTolerance)
                return DragHandle.ResizeStop;
            if (Math.Abs(point.X - rightX) <= lineTolerance && point.Y >= topY - 8d && point.Y <= bottomY + 8d)
                return DragHandle.Resize;
            if (Math.Abs(point.Y - stopY) <= lineTolerance)
                return DragHandle.Stop;
            if (Math.Abs(point.Y - targetY) <= lineTolerance)
                return DragHandle.Target;
            if (Math.Abs(point.Y - entryY) <= lineTolerance)
                return DragHandle.Entry;

            return DragHandle.None;
        }

        private bool IsPointInPricePanel(System.Windows.Point point)
        {
            ChartPanel chartPanel = GetInteractionChartPanel();
            return chartPanel != null &&
                   point.X >= chartPanel.X &&
                   point.X <= chartPanel.X + chartPanel.W &&
                   point.Y >= chartPanel.Y &&
                   point.Y <= chartPanel.Y + chartPanel.H;
        }

        private System.Windows.Point ClampPointToPricePanel(System.Windows.Point point)
        {
            ChartPanel chartPanel = GetInteractionChartPanel();
            if (chartPanel == null)
                return point;

            double x = Math.Max(chartPanel.X, Math.Min(chartPanel.X + chartPanel.W, point.X));
            double y = Math.Max(chartPanel.Y, Math.Min(chartPanel.Y + chartPanel.H, point.Y));
            return new System.Windows.Point(x, y);
        }

        private bool IsOverPanel(System.Windows.Point point)
        {
            ChartControl chartControl = GetInteractionChartControl();
            if (panel == null || chartControl == null)
                return false;

            try
            {
                GeneralTransform transform = panel.TransformToAncestor(chartControl);
                Rect bounds = transform.TransformBounds(new Rect(0, 0, panel.ActualWidth, panel.ActualHeight));
                return bounds.Contains(point);
            }
            catch
            {
                return false;
            }
        }

        private double GetPriceFromPoint(System.Windows.Point point)
        {
            ChartScale scale = GetPriceScale();
            return scale == null ? 0 : RoundToTick(scale.GetValueByYWpf(point.Y));
        }

        private ChartScale GetPriceScale()
        {
            ChartPanel chartPanel = GetInteractionChartPanel();
            if (chartPanel == null)
                return null;

            return chartPanel.Scales[ScaleJustification.Right]
                ?? chartPanel.Scales[ScaleJustification.Left]
                ?? chartPanel.Scales[ScaleJustification.Overlay];
        }

        private int GetPanelQuantity()
        {
            return Math.Max(1, panelQuantity);
        }

        private int GetChartTraderQuantity()
        {
            try
            {
                RefreshChartTraderReferences();
                if (chartTraderQuantitySelector != null)
                {
                    int value = Convert.ToInt32(chartTraderQuantitySelector.Value);
                    if (value > 0)
                        return value;
                }
            }
            catch
            {
            }

            int quantity = GetPanelQuantity();
            return quantity > 0 ? quantity : 1;
        }

        private int GetLiveInstrumentQuantity()
        {
            try
            {
                Position livePosition = GetLiveInstrumentPosition(GetSelectedChartAccount());
                return livePosition != null ? livePosition.Quantity : 0;
            }
            catch
            {
                return 0;
            }
        }

        private int GetLiveOrPlannedQuantity()
        {
            int liveQty = GetLiveInstrumentQuantity();
            return liveQty > 0 ? liveQty : GetChartTraderQuantity();
        }

        private Position GetLiveInstrumentPosition(Account account)
        {
            string instrumentFullName = GetSelectedTradeInstrumentFullName();
            return GetInstrumentPosition(account, instrumentFullName);
        }

        private Position GetInstrumentPosition(Account account, string instrumentFullName)
        {
            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return null;

            return account.Positions.FirstOrDefault(p =>
                p != null &&
                p.Instrument != null &&
                string.Equals(p.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase) &&
                p.MarketPosition != MarketPosition.Flat &&
                p.Quantity > 0);
        }

        private string GetSelectedTradeInstrumentFullNameSafe()
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(cachedSelectedInstrumentFullName))
                    return cachedSelectedInstrumentFullName;
            }
            catch
            {
            }

            try
            {
                if (Instrument != null && !string.IsNullOrWhiteSpace(Instrument.FullName))
                    return Instrument.FullName;
            }
            catch
            {
            }

            return GetSelectedTradeInstrumentFullName();
        }

        private bool HasActiveWorkingOrders(Account account, string instrumentFullName)
        {
            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return false;

            foreach (Order order in account.Orders)
            {
                if (order == null || order.Instrument == null)
                    continue;
                if (!IsOrderActive(order))
                    continue;
                if (!string.Equals(order.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                    continue;

                return true;
            }

            return false;
        }

        private void CancelFlatInstrumentOrders(Account account, string instrumentFullName)
        {
            try
            {
                if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                    return;

                Position livePosition = GetInstrumentPosition(account, instrumentFullName);
                if (livePosition != null && livePosition.MarketPosition != MarketPosition.Flat && livePosition.Quantity > 0)
                    return;

                Order[] workingOrders = account.Orders
                    .Where(o =>
                        o != null &&
                        o.Instrument != null &&
                        string.Equals(o.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase) &&
                        IsOrderActive(o) &&
                        !IsOrderSyncTransient(o) &&
                        o.OrderType != OrderType.Market)
                    .ToArray();

                if (workingOrders.Length > 0)
                    account.Cancel(workingOrders);
            }
            catch
            {
            }
        }

        private double GetSelectedInstrumentPrice(PriceReferenceMode mode)
        {
            Instrument selectedInstrument = GetSelectedTradeInstrument();
            if (selectedInstrument == null)
                return 0;

            bool sameAsPrimary = Instrument != null &&
                string.Equals(selectedInstrument.FullName, Instrument.FullName, StringComparison.OrdinalIgnoreCase);

            double bid = 0;
            double ask = 0;
            double last = 0;

            try
            {
                if (selectedInstrument.MarketData != null)
                {
                    bid = ExtractMarketDataPrice(selectedInstrument.MarketData.Bid);
                    ask = ExtractMarketDataPrice(selectedInstrument.MarketData.Ask);
                    last = ExtractMarketDataPrice(selectedInstrument.MarketData.Last);
                }
            }
            catch
            {
            }

            if (sameAsPrimary)
            {
                if (bid <= 0)
                    bid = GetCurrentBid();
                if (ask <= 0)
                    ask = GetCurrentAsk();
                if (last <= 0 && Close != null && CurrentBar >= 0)
                    last = Close[0];
            }

            if (last <= 0)
                TryGetSeriesLastPrice(selectedInstrument.FullName, out last);

            if (mode == PriceReferenceMode.LongEntry)
                return ask > 0 ? ask : (last > 0 ? last : bid);
            if (mode == PriceReferenceMode.ShortEntry)
                return bid > 0 ? bid : (last > 0 ? last : ask);
            if (mode == PriceReferenceMode.LongExit)
                return bid > 0 ? bid : (last > 0 ? last : ask);
            if (mode == PriceReferenceMode.ShortExit)
                return ask > 0 ? ask : (last > 0 ? last : bid);

            if (last > 0)
                return last;
            if (bid > 0 && ask > 0)
                return (bid + ask) * 0.5;
            return Math.Max(bid, ask);
        }

        private bool TryGetSeriesLastPrice(string instrumentFullName, out double price)
        {
            price = 0;

            try
            {
                if (BarsArray == null || Closes == null || string.IsNullOrWhiteSpace(instrumentFullName))
                    return false;

                for (int i = 0; i < BarsArray.Length; i++)
                {
                    NinjaTrader.Data.Bars bars = BarsArray[i];
                    if (bars == null || bars.Instrument == null)
                        continue;
                    if (!string.Equals(bars.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                        continue;
                    if (CurrentBars == null || CurrentBars.Length <= i || CurrentBars[i] < 0)
                        continue;

                    price = Closes[i][0];
                    if (price > 0)
                        return true;
                }
            }
            catch
            {
            }

            return false;
        }

        private Account GetSelectedChartAccount()
        {
            try
            {
                RefreshChartTraderReferences();
                if (chartTraderAccountSelector != null && chartTraderAccountSelector.SelectedAccount != null)
                    return chartTraderAccountSelector.SelectedAccount;
            }
            catch
            {
            }

            return availableAccounts.FirstOrDefault() ?? Account.All.FirstOrDefault();
        }

        private bool IsSelectedPanelAccount(Account account)
        {
            if (account == null)
                return false;

            string selectedAccountName = cachedSelectedAccountName;

            try
            {
                if (string.IsNullOrWhiteSpace(selectedAccountName) && (ChartControl == null || ChartControl.Dispatcher.CheckAccess()))
                {
                    Account selectedAccount = GetSelectedChartAccount();
                    selectedAccountName = selectedAccount != null ? selectedAccount.Name : string.Empty;
                    cachedSelectedAccountName = selectedAccountName ?? string.Empty;
                }
            }
            catch
            {
            }

            if (string.IsNullOrWhiteSpace(selectedAccountName))
                return false;

            return string.Equals(account.Name, selectedAccountName, StringComparison.OrdinalIgnoreCase);
        }

        private void UpdateSelectionCache()
        {
            try
            {
                Account selectedAccount = GetSelectedChartAccount();
                cachedSelectedAccountName = selectedAccount != null ? selectedAccount.Name ?? string.Empty : string.Empty;
            }
            catch
            {
            }

            try
            {
                Instrument selectedInstrument = GetSelectedTradeInstrument();
                cachedSelectedInstrumentFullName = selectedInstrument != null ? selectedInstrument.FullName ?? string.Empty : string.Empty;
            }
            catch
            {
            }
        }

        private Instrument GetSelectedTradeInstrument()
        {
            try
            {
                RefreshChartTraderReferences();
                RefreshActiveChartContext();
                if (chartTraderControl != null && chartTraderControl.Instrument != null)
                    return chartTraderControl.Instrument;
            }
            catch
            {
            }

            try
            {
                ChartControl chartControl = GetInteractionChartControl();
                if (chartControl != null && chartControl.Instrument != null)
                    return chartControl.Instrument;
            }
            catch
            {
            }

            return Instrument;
        }

        private string GetSelectedTradeInstrumentFullName()
        {
            Instrument selectedInstrument = GetSelectedTradeInstrument();
            return selectedInstrument != null ? selectedInstrument.FullName : string.Empty;
        }

        private bool IsOrderActive(Order order)
        {
            return order != null &&
                   order.OrderState != OrderState.Cancelled &&
                   order.OrderState != OrderState.Filled &&
                   order.OrderState != OrderState.Rejected &&
                   order.OrderState != OrderState.Unknown;
        }

        private bool IsOrderSyncTransient(Order order)
        {
            if (order == null)
                return false;

            return
                order.OrderState == OrderState.CancelPending ||
                order.OrderState == OrderState.ChangePending ||
                order.OrderState == OrderState.ChangeSubmitted ||
                order.OrderState == OrderState.Submitted ||
                order.OrderState == OrderState.TriggerPending;
        }

        private string BuildManagedExitSyncKey(Account account, string instrumentFullName)
        {
            string accountName = account != null ? account.Name ?? string.Empty : string.Empty;
            return accountName + "|" + (instrumentFullName ?? string.Empty);
        }

        private bool IsEntryLikeOrder(Order order)
        {
            if (order == null)
                return false;

            string name = order.Name ?? string.Empty;
            if (name.IndexOf("_ENTRY", StringComparison.OrdinalIgnoreCase) >= 0)
                return true;

            return order.OrderAction == OrderAction.Buy || order.OrderAction == OrderAction.SellShort;
        }

        private bool IsManagedEntryOrder(Order order)
        {
            if (order == null)
                return false;

            string name = order.Name ?? string.Empty;
            if (name.IndexOf("_ENTRY", StringComparison.OrdinalIgnoreCase) < 0)
                return false;

            return order.OrderAction == OrderAction.Buy || order.OrderAction == OrderAction.SellShort;
        }

        private double GetWorkingOrderPrice(Order order)
        {
            if (order == null)
                return 0;

            if (order.OrderType == OrderType.Limit || order.LimitPrice > 0)
                return order.LimitPrice;
            if ((order.OrderType == OrderType.StopMarket || order.OrderType == OrderType.StopLimit) && order.StopPrice > 0)
                return order.StopPrice;

            return 0;
        }

        private double ClampTargetPrice(double price)
        {
            double tick = GetPointStep();
            if (selectedSide == TradeSide.Long)
                return RoundToTick(Math.Max(price, entryPrice + tick));
            if (selectedSide == TradeSide.Short)
                return RoundToTick(Math.Min(price, entryPrice - tick));
            return RoundToTick(price);
        }

        private double ClampStopPrice(double price)
        {
            double tick = GetPointStep();
            if (selectedSide == TradeSide.Long)
                return RoundToTick(Math.Min(price, targetPrice - tick));
            if (selectedSide == TradeSide.Short)
                return RoundToTick(Math.Max(price, targetPrice + tick));
            return RoundToTick(price);
        }

        private double RoundToTick(double price)
        {
            Instrument selectedInstrument = GetSelectedTradeInstrument();
            return selectedInstrument == null ? price : selectedInstrument.MasterInstrument.RoundToTickSize(price);
        }

        private double GetPointStep()
        {
            Instrument selectedInstrument = GetSelectedTradeInstrument();
            return selectedInstrument != null && selectedInstrument.MasterInstrument != null
                ? selectedInstrument.MasterInstrument.TickSize
                : 0.25;
        }

        private double GetPointsAdjustmentStep()
        {
            return GetPointStep();
        }

        private List<string> GetConfiguredPointsPresets()
        {
            List<string> presets = new List<string>();
            string raw = PointsPresetValues ?? string.Empty;
            string[] tokens = raw.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string token in tokens)
            {
                double parsedValue;
                if (!double.TryParse(token.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out parsedValue))
                    continue;
                if (parsedValue <= 0)
                    continue;

                string normalizedText = NormalizePointValue(parsedValue).ToString("0.##", CultureInfo.InvariantCulture);
                if (!presets.Contains(normalizedText))
                    presets.Add(normalizedText);
            }

            if (presets.Count == 0)
            {
                presets.Add("1");
                presets.Add("2");
                presets.Add("5");
                presets.Add("10");
                presets.Add("15");
                presets.Add("20");
            }

            return presets;
        }

        private double NormalizePointValue(double value)
        {
            double step = GetPointStep();
            if (step <= 0)
                return value;

            return Math.Round(value / step, MidpointRounding.AwayFromZero) * step;
        }

        private void DrawOverlayLabel(string text, float x, float y, D2DColor textColor, float fontSize)
        {
            EnsureOverlayTextResources();

            DWriteTextFormat format = fontSize <= 12.5f ? overlaySmallTextFormat : overlayLargeTextFormat;
            if (format == null)
                return;

            using (var textBrush = new DxBrush(RenderTarget, textColor))
            {
                RectangleF rect = new RectangleF(x, y, 320f, 24f);
                RenderTarget.DrawText(text, format, rect, textBrush);
            }
        }

        private void DrawPlannerResizeHandle(float anchorX, float anchorY, DxBrush borderBrush, bool isUpperCorner)
        {
            const float handleSize = 10f;
            const float lineInset = 2.5f;

            const float horizontalInset = 4f;
            float left = anchorX - handleSize - horizontalInset;
            float top = isUpperCorner ? anchorY : anchorY - handleSize;
            RenderTarget.DrawLine(
                new Vector2(left + lineInset, top + lineInset),
                new Vector2(left + handleSize - lineInset, top + handleSize - lineInset),
                borderBrush,
                1.2f);
            RenderTarget.DrawLine(
                new Vector2(left + handleSize - lineInset, top + lineInset),
                new Vector2(left + lineInset, top + handleSize - lineInset),
                borderBrush,
                1.2f);
        }

        private void ForceRefresh()
        {
            if (!IsCurrentChartVisible())
                return;

            ChartControl chartControl = GetInteractionChartControl();
            if (chartControl != null)
                chartControl.InvalidateVisual();

            if (ChartControl != null && !ReferenceEquals(ChartControl, chartControl))
                ChartControl.InvalidateVisual();

            RefreshRrPanelText();
            RefreshPlannerOverlay();
        }

        private void RefreshPlannerOverlay()
        {
            if (plannerOverlay == null)
                return;

            if (!IsLicenseCurrentlyValid())
            {
                plannerOverlay.Children.Clear();
                return;
            }

            if (!IsCurrentChartVisible())
            {
                plannerOverlay.Children.Clear();
                return;
            }

            plannerOverlay.Children.Clear();
            ChartControl chartControl = GetInteractionChartControl();
            ChartPanel chartPanel = GetInteractionChartPanel();
            if (chartControl == null || chartPanel == null || chartGrid == null)
                return;
            bool drawPlannerOverlay = !ReferenceEquals(chartControl, ChartControl);

            ResolvedPlan resolved = default(ResolvedPlan);
            TradeMetrics metrics = default(TradeMetrics);
            bool isLong = false;
            bool hasPlan =
                planMode != PlanMode.Idle &&
                entryTime != default(DateTime) &&
                TryBuildResolvedPlan(out resolved) &&
                TryGetMetrics(out metrics, out isLong);

            Account panelAccount = GetSelectedChartAccount();
            string instrumentFullName = GetSelectedTradeInstrumentFullName();
            Order stopOrder;
            Order targetOrder;
            bool hasManagedOrders = TryGetManagedBracketOrders(panelAccount, instrumentFullName, out stopOrder, out targetOrder);

            if (!hasPlan && !hasManagedOrders)
                return;

            ChartScale chartScale = GetPriceScale();
            if (chartScale == null)
                return;

            float leftX;
            if (hasPlan)
                leftX = chartControl.GetXByTime(entryTime);
            else
                leftX = Math.Max((float)(chartPanel.X + 60), chartControl.CanvasRight - Math.Max(140, BoxWidthPixels) - 80f);

            float rightX = leftX + BoxWidthPixels;
            float maxRight = chartControl.CanvasRight - 80f;
            if (rightX > maxRight)
                rightX = maxRight;
            if (rightX <= leftX + 40f)
                rightX = leftX + 40f;

            if (hasPlan)
            {
                float entryY = chartScale.GetYByValue(resolved.EntryPrice);
                float stopY = chartScale.GetYByValue(resolved.StopPrice);
                float targetY = chartScale.GetYByValue(resolved.TargetPrice);

                System.Windows.Point leftEntryPoint;
                System.Windows.Point rightEntryPoint;
                System.Windows.Point leftStopPoint;
                System.Windows.Point leftTargetPoint;
                System.Windows.Point rightStopPoint;
                System.Windows.Point rightTargetPoint;
                if (!TryTransformChartPointToGrid(chartControl, leftX, entryY, out leftEntryPoint) ||
                    !TryTransformChartPointToGrid(chartControl, rightX, entryY, out rightEntryPoint) ||
                    !TryTransformChartPointToGrid(chartControl, leftX, stopY, out leftStopPoint) ||
                    !TryTransformChartPointToGrid(chartControl, leftX, targetY, out leftTargetPoint) ||
                    !TryTransformChartPointToGrid(chartControl, rightX, stopY, out rightStopPoint) ||
                    !TryTransformChartPointToGrid(chartControl, rightX, targetY, out rightTargetPoint))
                    return;

                double rectLeft = Math.Min(leftEntryPoint.X, rightEntryPoint.X);
                double rectWidth = Math.Abs(rightEntryPoint.X - leftEntryPoint.X);
                double rewardTop = Math.Min(leftEntryPoint.Y, leftTargetPoint.Y);
                double rewardHeight = Math.Abs(leftEntryPoint.Y - leftTargetPoint.Y);
                double riskTop = Math.Min(leftEntryPoint.Y, leftStopPoint.Y);
                double riskHeight = Math.Abs(leftEntryPoint.Y - leftStopPoint.Y);

                if (drawPlannerOverlay)
                {
                    plannerOverlay.Children.Add(new System.Windows.Shapes.Rectangle
                    {
                        Width = rectWidth,
                        Height = rewardHeight,
                        Fill = new WpfSolidColorBrush(WpfColor.FromArgb(85, 8, 92, 56))
                    });
                    Canvas.SetLeft(plannerOverlay.Children[plannerOverlay.Children.Count - 1], rectLeft);
                    Canvas.SetTop(plannerOverlay.Children[plannerOverlay.Children.Count - 1], rewardTop);

                    plannerOverlay.Children.Add(new System.Windows.Shapes.Rectangle
                    {
                        Width = rectWidth,
                        Height = riskHeight,
                        Fill = new WpfSolidColorBrush(WpfColor.FromArgb(85, 122, 24, 24))
                    });
                    Canvas.SetLeft(plannerOverlay.Children[plannerOverlay.Children.Count - 1], rectLeft);
                    Canvas.SetTop(plannerOverlay.Children[plannerOverlay.Children.Count - 1], riskTop);

                    plannerOverlay.Children.Add(new System.Windows.Shapes.Line
                    {
                        X1 = leftEntryPoint.X,
                        Y1 = leftEntryPoint.Y,
                        X2 = rightEntryPoint.X,
                        Y2 = rightEntryPoint.Y,
                        Stroke = new WpfSolidColorBrush(WpfColor.FromRgb(90, 220, 255)),
                        StrokeThickness = 1.5
                    });

                    string stopLabel = metrics.StopLocksProfit ? "LOCK " : "SL ";
                    string stopDollarText = metrics.StopLocksProfit
                        ? ((metrics.StopDollars(GetLiveOrPlannedQuantity()) >= 0 ? "+$" : "-$") + Math.Abs(metrics.StopDollars(GetLiveOrPlannedQuantity())).ToString("0"))
                        : ("$" + Math.Abs(metrics.StopDollars(GetLiveOrPlannedQuantity())).ToString("0"));

                    AddPlannerOverlayText("TP " + metrics.RewardPoints.ToString("0.00") + " pts | $" + metrics.RewardDollars(GetLiveOrPlannedQuantity()).ToString("0"), leftEntryPoint.X + 10, isLong ? rewardTop - 18 : rewardTop + rewardHeight + 4, WpfColor.FromArgb(185, 228, 218, 145), 15);
                    AddPlannerOverlayText(stopLabel + metrics.RiskPoints.ToString("0.00") + " pts | " + stopDollarText, leftEntryPoint.X + 10, isLong ? riskTop + riskHeight + 4 : riskTop - 22, WpfColor.FromArgb(185, 228, 218, 145), 15);
                    bool targetIsUpperCorner = rightTargetPoint.Y <= rightStopPoint.Y;
                    AddPlannerCornerHandle(
                        rightTargetPoint,
                        WpfColor.FromRgb(160, 255, 190),
                        targetIsUpperCorner);
                    AddPlannerCornerHandle(
                        rightStopPoint,
                        WpfColor.FromRgb(255, 182, 182),
                        !targetIsUpperCorner);
                }
            }

            if (ShouldRenderPanelAccountOrderMarkers())
                AddManagedOrderOverlayMarkers(stopOrder, targetOrder, chartControl, chartScale, leftX, rightX);
        }

        private void AddPlannerOverlayText(string text, double left, double top, WpfColor color, double fontSize)
        {
            if (plannerOverlay == null)
                return;

            TextBlock textBlock = new TextBlock
            {
                Text = text,
                Foreground = new WpfSolidColorBrush(color),
                FontSize = fontSize
            };

            plannerOverlay.Children.Add(textBlock);
            Canvas.SetLeft(textBlock, left);
            Canvas.SetTop(textBlock, top);
        }

        private void AddPlannerCornerHandle(System.Windows.Point anchorPoint, WpfColor accentColor, bool isUpperCorner)
        {
            if (plannerOverlay == null)
                return;

            const double handleSize = 10d;
            const double horizontalInset = 4d;

            TextBlock handleText = new TextBlock
            {
                Text = "X",
                Foreground = new WpfSolidColorBrush(accentColor),
                FontSize = 10,
                Width = handleSize,
                Height = handleSize,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                TextAlignment = System.Windows.TextAlignment.Center
            };

            plannerOverlay.Children.Add(handleText);
            Canvas.SetLeft(handleText, anchorPoint.X - handleSize - horizontalInset);
            Canvas.SetTop(handleText, isUpperCorner ? anchorPoint.Y : anchorPoint.Y - handleSize);
        }

        private void AddManagedOrderOverlayMarkers(Order stopOrder, Order targetOrder, ChartControl chartControl, ChartScale chartScale, float leftX, float rightX)
        {
            if (plannerOverlay == null || chartControl == null || chartScale == null)
                return;

            if (stopOrder == null && targetOrder == null)
                return;

            if (targetOrder != null)
            {
                double targetPrice = GetWorkingOrderPrice(targetOrder);
                float targetY = chartScale.GetYByValue(targetPrice);
                System.Windows.Point leftTargetPoint;
                System.Windows.Point rightTargetPoint;
                if (TryTransformChartPointToGrid(chartControl, leftX, targetY, out leftTargetPoint) &&
                    TryTransformChartPointToGrid(chartControl, rightX, targetY, out rightTargetPoint))
                {
                    AddManagedOrderMarker(targetOrder, leftTargetPoint, rightTargetPoint, WpfColor.FromRgb(66, 246, 255), WpfColor.FromRgb(0, 0, 0));
                }
            }

            if (stopOrder != null)
            {
                double stopPrice = GetWorkingOrderPrice(stopOrder);
                float stopY = chartScale.GetYByValue(stopPrice);
                System.Windows.Point leftStopPoint;
                System.Windows.Point rightStopPoint;
                if (TryTransformChartPointToGrid(chartControl, leftX, stopY, out leftStopPoint) &&
                    TryTransformChartPointToGrid(chartControl, rightX, stopY, out rightStopPoint))
                {
                    AddManagedOrderMarker(stopOrder, leftStopPoint, rightStopPoint, WpfColor.FromRgb(255, 212, 222), WpfColor.FromRgb(0, 0, 0));
                }
            }
        }

        private void AddManagedOrderMarker(Order order, System.Windows.Point leftPoint, System.Windows.Point rightPoint, WpfColor backgroundColor, WpfColor foregroundColor)
        {
            if (plannerOverlay == null || order == null)
                return;

            Border tagBorder = new Border
            {
                Background = new WpfSolidColorBrush(backgroundColor),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(180, 36, 36, 36)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(6, 1, 6, 1),
                Child = new TextBlock
                {
                    Text = GetManagedOrderMarkerText(order),
                    Foreground = new WpfSolidColorBrush(foregroundColor),
                    FontSize = 12
                }
            };

            plannerOverlay.Children.Add(tagBorder);
            tagBorder.Measure(new System.Windows.Size(double.PositiveInfinity, double.PositiveInfinity));
            System.Windows.Size desiredSize = tagBorder.DesiredSize;
            Canvas.SetLeft(tagBorder, Math.Max(0, leftPoint.X - desiredSize.Width - 6));
            Canvas.SetTop(tagBorder, leftPoint.Y - (desiredSize.Height * 0.5));

            Border rightHandle = new Border
            {
                Width = 16,
                Height = 16,
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(255, 38, 38, 38)),
                BorderBrush = new WpfSolidColorBrush(backgroundColor),
                BorderThickness = new Thickness(1),
                Child = new TextBlock
                {
                    Text = "X",
                    Foreground = new WpfSolidColorBrush(backgroundColor),
                    FontSize = 11,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center,
                    TextAlignment = System.Windows.TextAlignment.Center
                }
            };

            plannerOverlay.Children.Add(rightHandle);
            Canvas.SetLeft(rightHandle, rightPoint.X - (rightHandle.Width * 0.5));
            Canvas.SetTop(rightHandle, rightPoint.Y - (rightHandle.Height * 0.5));
        }

        private string GetManagedOrderMarkerText(Order order)
        {
            int quantity = order.Quantity > 0 ? order.Quantity : GetLiveOrPlannedQuantity();
            string actionText =
                order.OrderAction == OrderAction.Buy || order.OrderAction == OrderAction.BuyToCover
                    ? "Buy"
                    : "Sell";
            string typeText =
                order.OrderType == OrderType.Limit
                    ? "LMT"
                    : "STP";

            return quantity.ToString() + " " + actionText + " " + typeText;
        }

        private bool ShouldRenderPanelAccountOrderMarkers()
        {
            return false;
        }

        private bool TryGetManagedBracketOrders(Account account, string instrumentFullName, out Order stopOrder, out Order targetOrder)
        {
            stopOrder = null;
            targetOrder = null;

            if (account == null || string.IsNullOrWhiteSpace(instrumentFullName))
                return false;

            foreach (Order order in account.Orders)
            {
                if (order == null || order.Instrument == null)
                    continue;
                if (!IsOrderActive(order))
                    continue;
                if (!string.Equals(order.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (stopOrder == null && string.Equals(order.Name, "RRPANEL_STOP", StringComparison.OrdinalIgnoreCase))
                    stopOrder = order;
                else if (targetOrder == null && string.Equals(order.Name, "RRPANEL_TARGET", StringComparison.OrdinalIgnoreCase))
                    targetOrder = order;
            }

            return stopOrder != null || targetOrder != null;
        }

        private bool TryTransformChartPointToGrid(ChartControl chartControl, double x, double y, out System.Windows.Point gridPoint)
        {
            gridPoint = new System.Windows.Point();
            if (chartControl == null || chartGrid == null || double.IsNaN(x) || double.IsNaN(y) || double.IsInfinity(x) || double.IsInfinity(y))
                return false;

            try
            {
                GeneralTransform transform = chartControl.TransformToAncestor(chartGrid);
                gridPoint = transform.Transform(new System.Windows.Point(x, y));
                return true;
            }
            catch
            {
                return false;
            }
        }

        private void EnsureEntryTimeVisible()
        {
            if (entryTime == default(DateTime) || !IsEntryTimeVisible())
                AnchorEntryTimeToVisibleChart();
        }

        private bool IsEntryTimeVisible()
        {
            return IsChartTimeVisible(GetInteractionChartControl(), GetInteractionChartPanel(), entryTime);
        }

        private void AnchorEntryTimeToVisibleChart()
        {
            ChartControl chartControl = GetInteractionChartControl();
            ChartPanel chartPanel = GetInteractionChartPanel();
            DateTime selectedBarTime;

            if (TryGetSelectedInstrumentBarTime(out selectedBarTime) &&
                IsChartTimeVisible(chartControl, chartPanel, selectedBarTime))
            {
                entryTime = selectedBarTime;
                return;
            }

            if (chartControl == null || chartPanel == null)
            {
                if (entryTime == default(DateTime))
                    entryTime = Core.Globals.Now;
                return;
            }

            double anchorX = GetDefaultPlannerAnchorX(chartControl, chartPanel);
            entryTime = chartControl.GetTimeByX((int)anchorX);
        }

        private double GetDefaultPlannerAnchorX(ChartControl chartControl, ChartPanel chartPanel)
        {
            if (chartControl == null || chartPanel == null)
                return 0;

            double safeLeft = chartPanel.X + Math.Max(40d, chartPanel.W * 0.06);
            double safeRight = chartControl.CanvasRight - BoxWidthPixels - 120d;
            if (safeRight < safeLeft)
                safeRight = chartControl.CanvasRight - BoxWidthPixels - 80d;

            double preferred = chartPanel.X + (chartPanel.W * 0.42);
            return Math.Max(safeLeft, Math.Min(safeRight, preferred));
        }

        private bool IsChartTimeVisible(ChartControl chartControl, ChartPanel chartPanel, DateTime time)
        {
            if (chartControl == null || chartPanel == null || time == default(DateTime))
                return false;

            float x = chartControl.GetXByTime(time);
            return !float.IsNaN(x) &&
                !float.IsInfinity(x) &&
                x >= chartPanel.X - 10 &&
                x <= chartControl.CanvasRight - 40f;
        }

        private bool TryGetSelectedInstrumentBarTime(out DateTime barTime)
        {
            barTime = default(DateTime);

            Instrument selectedInstrument = GetSelectedTradeInstrument();
            string instrumentFullName = selectedInstrument != null ? selectedInstrument.FullName : string.Empty;

            try
            {
                if (BarsArray != null &&
                    Times != null &&
                    CurrentBars != null &&
                    !string.IsNullOrWhiteSpace(instrumentFullName))
                {
                    for (int i = 0; i < BarsArray.Length; i++)
                    {
                        NinjaTrader.Data.Bars bars = BarsArray[i];
                        if (bars == null || bars.Instrument == null)
                            continue;
                        if (!string.Equals(bars.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase))
                            continue;
                        if (CurrentBars.Length <= i || CurrentBars[i] < 0)
                            continue;

                        barTime = Times[i][0];
                        if (barTime != default(DateTime))
                            return true;
                    }
                }
            }
            catch
            {
            }

            try
            {
                if (CurrentBar >= 0)
                {
                    barTime = Time[0];
                    return barTime != default(DateTime);
                }
            }
            catch
            {
            }

            return false;
        }

        private double ExtractMarketDataPrice(MarketDataEventArgs marketData)
        {
            if (marketData == null)
                return 0;

            if (marketData.Price > 0)
                return marketData.Price;
            if (marketData.Last > 0)
                return marketData.Last;
            if (marketData.Ask > 0)
                return marketData.Ask;
            if (marketData.Bid > 0)
                return marketData.Bid;

            return 0;
        }

        private void InitializePanelQuantity()
        {
            try
            {
                if (chartTraderQuantitySelector != null)
                {
                    int value = Convert.ToInt32(chartTraderQuantitySelector.Value);
                    if (value > 0)
                        panelQuantity = value;
                }
            }
            catch
            {
            }

            panelQuantity = Math.Max(1, panelQuantity);
            UpdateQuantityDisplay();
        }

        private void SetPanelQuantity(int quantity)
        {
            panelQuantity = Math.Max(1, quantity);
            UpdateQuantityDisplay();
            RefreshPointControls();
            UpdateInfoText();
        }

        private void UpdateQuantityDisplay()
        {
            if (quantityValueText != null)
                quantityValueText.Text = Math.Max(1, panelQuantity).ToString();
        }

        private List<Account> GetAvailableAccounts()
        {
            availableAccounts.Clear();

            if (chartTraderAccountSelector != null)
            {
                foreach (object item in chartTraderAccountSelector.Items)
                {
                    Account account = item as Account;
                    if (account != null && !availableAccounts.Contains(account))
                        availableAccounts.Add(account);
                }

                Account selected = chartTraderAccountSelector.SelectedAccount;
                if (selected != null && !availableAccounts.Contains(selected))
                    availableAccounts.Add(selected);
            }

            if (availableAccounts.Count == 0)
            {
                lock (Connection.Connections)
                {
                    foreach (Connection connection in Connection.Connections)
                    {
                        if (connection == null || connection.Status != ConnectionStatus.Connected)
                            continue;

                        foreach (Account account in connection.Accounts)
                        {
                            if (account != null && !availableAccounts.Contains(account))
                                availableAccounts.Add(account);
                        }
                    }
                }
            }

            return availableAccounts;
        }

        private bool HasPendingTradeBlueprint(Account account, string instrumentFullName)
        {
            return pendingTrades.Values.Any(t =>
                t != null &&
                t.Account == account &&
                t.Instrument != null &&
                string.Equals(t.Instrument.FullName, instrumentFullName, StringComparison.OrdinalIgnoreCase));
        }

        private bool TryGetChartTraderRegion(out Rect region)
        {
            region = Rect.Empty;

            if (chartGrid == null)
                return false;

            Rect chartTraderRect;
            if (!TryGetElementBoundsRelativeToChartGrid(chartTraderControl as FrameworkElement, out chartTraderRect))
                return false;

            Rect anchorRect = chartTraderRect;
            FrameworkElement preferredAnchor = FindElementByText(chartTraderControl, "B:") as FrameworkElement
                ?? FindElementByText(chartTraderControl, "A:") as FrameworkElement
                ?? FindElementByText(chartTraderControl, "ATM Strategy") as FrameworkElement
                ?? chartTraderQuantitySelector as FrameworkElement
                ?? chartTraderAccountSelector as FrameworkElement;

            if (preferredAnchor != null)
                TryGetElementBoundsRelativeToChartGrid(preferredAnchor, out anchorRect);

            double left = Math.Max(0, chartTraderRect.Left + 2);
            double top = Math.Max(0, anchorRect.Bottom + 10);
            double width = Math.Max(220, chartTraderRect.Width - 10);
            double height = Math.Max(120, chartTraderRect.Bottom - top - 6);

            if (height <= 0)
            {
                top = Math.Max(0, chartTraderRect.Top + 180);
                height = Math.Max(120, chartTraderRect.Bottom - top - 6);
            }

            region = new Rect(left, top, width, height);
            return width > 0 && height > 0;
        }

        private void ApplyChartTraderVisibilityTweaks()
        {
            if (chartTraderControl == null)
                return;

            CollapseChartTraderSection("Buy Mkt", "Sell Bid", 180);
            CollapseChartTraderSection("Flat", "Entry", 90);
            HideChartTraderElementByText("PnL");
        }

        private void HideChartTraderElementByText(string text)
        {
            FrameworkElement element = FindElementByText(chartTraderControl, text) as FrameworkElement;
            if (element == null)
                return;

            CollapseChartTraderElement(element);
        }

        private void CollapseChartTraderSection(string firstText, string secondText, double maxHeight)
        {
            FrameworkElement firstElement = FindElementByText(chartTraderControl, firstText) as FrameworkElement;
            FrameworkElement secondElement = FindElementByText(chartTraderControl, secondText) as FrameworkElement;
            FrameworkElement sharedAncestor = FindSharedAncestor(firstElement, secondElement);

            if (sharedAncestor != null &&
                !ReferenceEquals(sharedAncestor, chartTraderControl) &&
                sharedAncestor.ActualHeight > 0 &&
                sharedAncestor.ActualHeight <= maxHeight)
            {
                CollapseChartTraderElement(sharedAncestor);
                return;
            }

            HideChartTraderElementByText(firstText);
            HideChartTraderElementByText(secondText);
        }

        private FrameworkElement FindSharedAncestor(FrameworkElement firstElement, FrameworkElement secondElement)
        {
            if (firstElement == null || secondElement == null)
                return null;

            HashSet<DependencyObject> firstAncestors = new HashSet<DependencyObject>();
            DependencyObject current = firstElement;
            while (current != null)
            {
                firstAncestors.Add(current);
                current = VisualTreeHelper.GetParent(current);
            }

            current = secondElement;
            while (current != null)
            {
                if (firstAncestors.Contains(current))
                    return current as FrameworkElement;

                current = VisualTreeHelper.GetParent(current);
            }

            return null;
        }

        private void CollapseChartTraderElement(FrameworkElement element)
        {
            if (element == null)
                return;

            if (!chartTraderVisibilityRestore.ContainsKey(element))
                chartTraderVisibilityRestore[element] = element.Visibility;

            element.Visibility = Visibility.Collapsed;
        }

        private void RestoreChartTraderVisibilityTweaks()
        {
            if (chartTraderVisibilityRestore.Count == 0)
                return;

            foreach (KeyValuePair<FrameworkElement, Visibility> entry in chartTraderVisibilityRestore.ToList())
            {
                if (entry.Key == null)
                    continue;

                entry.Key.Visibility = entry.Value;
            }

            chartTraderVisibilityRestore.Clear();
        }

        private bool TryGetElementBoundsRelativeToChartGrid(FrameworkElement element, out Rect bounds)
        {
            bounds = Rect.Empty;

            if (element == null || chartGrid == null || !element.IsVisible || element.ActualWidth <= 0 || element.ActualHeight <= 0)
                return false;

            try
            {
                GeneralTransform transform = element.TransformToAncestor(chartGrid);
                bounds = transform.TransformBounds(new Rect(0, 0, element.ActualWidth, element.ActualHeight));
                return bounds.Width > 0 && bounds.Height > 0;
            }
            catch
            {
                return false;
            }
        }

        private void EnsurePanelAttachedToCurrentHost()
        {
            if (panel == null)
                return;

            if (chartGrid != null && !chartGrid.Children.Contains(panel))
                AttachPanelToHost();
        }

        private void AttachPanelToHost()
        {
            if (panel == null)
                return;

            if (chartGrid == null)
                return;

            if (!chartGrid.Children.Contains(panel))
            {
                Grid.SetColumnSpan(panel, Math.Max(1, chartGrid.ColumnDefinitions.Count));
                Grid.SetRowSpan(panel, Math.Max(1, chartGrid.RowDefinitions.Count));
                chartGrid.Children.Add(panel);
                System.Windows.Controls.Panel.SetZIndex(panel, 9999);
            }
        }

        private void EnsurePlannerOverlayAttached()
        {
            if (chartGrid == null)
                return;

            if (plannerOverlay == null)
            {
                plannerOverlay = new Canvas
                {
                    IsHitTestVisible = false,
                    HorizontalAlignment = HorizontalAlignment.Stretch,
                    VerticalAlignment = VerticalAlignment.Stretch
                };
            }

            if (!chartGrid.Children.Contains(plannerOverlay))
            {
                Grid.SetColumnSpan(plannerOverlay, Math.Max(1, chartGrid.ColumnDefinitions.Count));
                Grid.SetRowSpan(plannerOverlay, Math.Max(1, chartGrid.RowDefinitions.Count));
                chartGrid.Children.Add(plannerOverlay);
                System.Windows.Controls.Panel.SetZIndex(plannerOverlay, 9998);
            }
        }

        private void DetachPlannerOverlay()
        {
            if (plannerOverlay != null)
                plannerOverlay.Children.Clear();

            if (chartGrid != null && plannerOverlay != null && chartGrid.Children.Contains(plannerOverlay))
                chartGrid.Children.Remove(plannerOverlay);
        }

        private void DetachPanelFromHost()
        {
            if (panel == null)
                return;

            if (chartGrid != null && chartGrid.Children.Contains(panel))
                chartGrid.Children.Remove(panel);
        }

        private DependencyObject FindElementByText(DependencyObject parent, string text)
        {
            if (parent == null || string.IsNullOrWhiteSpace(text))
                return null;

            TextBlock textBlock = parent as TextBlock;
            if (textBlock != null && string.Equals(textBlock.Text, text, StringComparison.OrdinalIgnoreCase))
                return textBlock;

            ContentControl contentControl = parent as ContentControl;
            if (contentControl != null && contentControl.Content != null && string.Equals(contentControl.Content.ToString(), text, StringComparison.OrdinalIgnoreCase))
                return contentControl;

            int childCount = VisualTreeHelper.GetChildrenCount(parent);
            for (int i = 0; i < childCount; i++)
            {
                DependencyObject found = FindElementByText(VisualTreeHelper.GetChild(parent, i), text);
                if (found != null)
                    return found;
            }

            return null;
        }

        private T FindVisibleElementByType<T>(DependencyObject parent) where T : DependencyObject
        {
            if (parent == null)
                return null;

            T typed = parent as T;
            FrameworkElement frameworkElement = typed as FrameworkElement;
            if (typed != null && (frameworkElement == null || (frameworkElement.IsVisible && frameworkElement.ActualWidth > 0 && frameworkElement.ActualHeight > 0)))
                return typed;

            int childCount = VisualTreeHelper.GetChildrenCount(parent);
            for (int i = 0; i < childCount; i++)
            {
                T nested = FindVisibleElementByType<T>(VisualTreeHelper.GetChild(parent, i));
                if (nested != null)
                    return nested;
            }

            return null;
        }

        private Grid BuildMetricRow(string label, TextBlock valueText, TextBlock dollarText, Button upButton, Button downButton, Button presetButton, System.Windows.Media.Brush foreground)
        {
            Grid row = new Grid { Margin = new Thickness(0, 2, 0, 6) };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(50) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(44) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(18) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(18) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            TextBlock labelText = new TextBlock
            {
                Text = label,
                Foreground = foreground,
                VerticalAlignment = VerticalAlignment.Center
            };

            Border valueBorder = new Border
            {
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(255, 48, 48, 48)),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(255, 88, 88, 88)),
                BorderThickness = new Thickness(1),
                Height = 22,
                Width = 44,
                Margin = new Thickness(0, 0, 2, 0),
                Child = valueText
            };

            Grid spinnerGrid = new Grid
            {
                Width = 18,
                Height = 22,
                Margin = new Thickness(0, 0, 2, 0)
            };
            spinnerGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(11) });
            spinnerGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(11) });

            Grid.SetRow(upButton, 0);
            Grid.SetRow(downButton, 1);
            spinnerGrid.Children.Add(upButton);
            spinnerGrid.Children.Add(downButton);

            Grid.SetColumn(labelText, 0);
            Grid.SetColumn(valueBorder, 1);
            Grid.SetColumn(spinnerGrid, 2);
            Grid.SetColumn(presetButton, 3);
            Grid.SetColumn(dollarText, 4);

            row.Children.Add(labelText);
            row.Children.Add(valueBorder);
            row.Children.Add(spinnerGrid);
            row.Children.Add(presetButton);
            row.Children.Add(dollarText);

            return row;
        }

        private void ConfigurePointsPresetButton(Button button, bool isTpButton)
        {
            if (button == null)
                return;

            button.Width = 16;
            button.Height = 22;
            button.MinWidth = 0;
            button.MinHeight = 0;
            button.Padding = new Thickness(0);
            button.HorizontalAlignment = HorizontalAlignment.Stretch;
            button.VerticalAlignment = VerticalAlignment.Stretch;

            ContextMenu menu = new ContextMenu();
            List<string> presets = GetConfiguredPointsPresets();

            foreach (string preset in presets)
            {
                MenuItem item = new MenuItem
                {
                    Header = preset,
                    Tag = new PresetMenuTag { IsTp = isTpButton, Value = preset }
                };
                item.Click += OnPointsPresetMenuItemClick;
                menu.Items.Add(item);
            }

            button.ContextMenu = menu;
            button.Click += OnPointsPresetButtonClick;
        }

        private void OnPointsPresetButtonClick(object sender, RoutedEventArgs e)
        {
            Button button = sender as Button;
            if (button == null || button.ContextMenu == null)
                return;

            button.ContextMenu.PlacementTarget = button;
            button.ContextMenu.Placement = System.Windows.Controls.Primitives.PlacementMode.Bottom;
            button.ContextMenu.IsOpen = true;
            e.Handled = true;
        }

        private void OnPointsPresetMenuItemClick(object sender, RoutedEventArgs e)
        {
            MenuItem item = sender as MenuItem;
            PresetMenuTag tag = item != null ? item.Tag as PresetMenuTag : null;
            double selectedValue;

            if (tag == null || !double.TryParse(tag.Value, out selectedValue) || selectedValue <= 0)
                return;

            double normalizedValue = NormalizePointValue(selectedValue);
            if (tag.IsTp)
                tpPointsValue = normalizedValue;
            else
                slPointsValue = normalizedValue;

            RefreshPointControls();
            ReapplyOffsetsIfReady();
            e.Handled = true;
        }

        private T FindElementByType<T>(DependencyObject parent) where T : DependencyObject
        {
            if (parent == null)
                return null;

            T typed = parent as T;
            if (typed != null)
                return typed;

            int childCount = VisualTreeHelper.GetChildrenCount(parent);
            for (int i = 0; i < childCount; i++)
            {
                T found = FindElementByType<T>(VisualTreeHelper.GetChild(parent, i));
                if (found != null)
                    return found;
            }

            return null;
        }

        private static Button CreateButton(string text)
        {
            return new Button
            {
                Content = text,
                Margin = new Thickness(2, 0, 2, 0),
                Height = 22,
                Padding = new Thickness(2, 0, 2, 0),
                Foreground = Brushes.White,
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(255, 45, 45, 45)),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(255, 80, 80, 80)),
                FontSize = 12,
                HorizontalContentAlignment = HorizontalAlignment.Center,
                VerticalContentAlignment = VerticalAlignment.Center,
                IsHitTestVisible = true
            };
        }

        private static TextBlock CreateQtyArrowContent(string text)
        {
            return new TextBlock
            {
                Text = text,
                Foreground = Brushes.White,
                FontFamily = new FontFamily("Segoe UI Symbol"),
                FontSize = 8,
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                TextAlignment = System.Windows.TextAlignment.Center
            };
        }

        private static Button CreateSpinnerButton(string text)
        {
            return new Button
            {
                Content = CreateQtyArrowContent(text),
                Width = 16,
                Height = 11,
                MinWidth = 0,
                MinHeight = 0,
                Margin = new Thickness(0),
                Padding = new Thickness(0),
                Foreground = Brushes.White,
                Background = new WpfSolidColorBrush(WpfColor.FromArgb(255, 45, 45, 45)),
                BorderBrush = new WpfSolidColorBrush(WpfColor.FromArgb(255, 80, 80, 80)),
                BorderThickness = new Thickness(1),
                HorizontalContentAlignment = HorizontalAlignment.Center,
                VerticalContentAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Stretch,
                VerticalAlignment = VerticalAlignment.Stretch,
                IsHitTestVisible = true
            };
        }

        private static TextBlock CreateValueText(double value)
        {
            return new TextBlock
            {
                Text = value.ToString("0.##"),
                Foreground = Brushes.White,
                Width = 40,
                VerticalAlignment = VerticalAlignment.Center,
                TextAlignment = System.Windows.TextAlignment.Center
            };
        }

        private static TextBlock CreateDollarText()
        {
            return new TextBlock
            {
                Text = "$0",
                Foreground = Brushes.Gainsboro,
                Width = 120,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(20, 0, 0, 0),
                TextAlignment = System.Windows.TextAlignment.Left
            };
        }

        private struct ResolvedPlan
        {
            public double EntryPrice;
            public double StopPrice;
            public double TargetPrice;
            public bool IsLong;
        }

        private struct TradeMetrics
        {
            public double RiskPoints;
            public double RewardPoints;
            public double RiskTicks;
            public double RewardTicks;
            public double DollarsPerContract;
            public double RewardDollarsPerContract;
            public double StopOffsetPoints;
            public double StopOffsetDollarsPerContract;
            public double Ratio;
            public bool StopLocksProfit
            {
                get { return StopOffsetPoints > 0; }
            }

            public double RiskDollars(int quantity)
            {
                return DollarsPerContract * Math.Max(1, quantity);
            }

            public double StopDollars(int quantity)
            {
                return StopOffsetDollarsPerContract * Math.Max(1, quantity);
            }

            public double RewardDollars(int quantity)
            {
                return RewardDollarsPerContract * Math.Max(1, quantity);
            }
        }

        private class PendingTrade
        {
            public Account Account { get; set; }
            public Instrument Instrument { get; set; }
            public OrderAction ExitAction { get; set; }
            public Order StopOrder { get; set; }
            public Order TargetOrder { get; set; }
            public string EntryOrderId { get; set; }
            public string EntryOrderName { get; set; }
            public double PlannedEntryPrice { get; set; }
            public double StopPrice { get; set; }
            public double TargetPrice { get; set; }
            public bool IsLong { get; set; }
            public bool AlignToFillPrice { get; set; }
            public string OcoId { get; set; }
            public bool ExitSubmitted { get; set; }
        }

        private class PresetMenuTag
        {
            public bool IsTp { get; set; }
            public string Value { get; set; }
        }

        private class PendingCloseRequest
        {
            public Account Account { get; set; }
            public Instrument Instrument { get; set; }
            public int Quantity { get; set; }
        }
    }
}

#region NinjaScript generated code. Neither change nor remove.

namespace NinjaTrader.NinjaScript.Indicators
{
	public partial class Indicator : NinjaTrader.Gui.NinjaScript.IndicatorRenderBase
	{
		private RRtradePannel[] cacheRRtradePannel;
		public RRtradePannel RRtradePannel(int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues)
		{
			return RRtradePannel(Input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, string.Empty, true);
		}

		public RRtradePannel RRtradePannel(int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues, string licenseKey, bool useLocalLicenseServer)
		{
			return RRtradePannel(Input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, licenseKey, useLocalLicenseServer);
		}

		public RRtradePannel RRtradePannel(ISeries<double> input, int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues)
		{
			return RRtradePannel(input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, string.Empty, true);
		}

		public RRtradePannel RRtradePannel(ISeries<double> input, int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues, string licenseKey, bool useLocalLicenseServer)
		{
			if (cacheRRtradePannel != null)
				for (int idx = 0; idx < cacheRRtradePannel.Length; idx++)
					if (cacheRRtradePannel[idx] != null && cacheRRtradePannel[idx].PanelLeft == panelLeft && cacheRRtradePannel[idx].PanelTop == panelTop && cacheRRtradePannel[idx].BoxWidthPixels == boxWidthPixels && cacheRRtradePannel[idx].PointsPresetValues == pointsPresetValues && cacheRRtradePannel[idx].LicenseKey == licenseKey && cacheRRtradePannel[idx].UseLocalLicenseServer == useLocalLicenseServer && cacheRRtradePannel[idx].EqualsInput(input))
						return cacheRRtradePannel[idx];
			return CacheIndicator<RRtradePannel>(new RRtradePannel(){ PanelLeft = panelLeft, PanelTop = panelTop, BoxWidthPixels = boxWidthPixels, PointsPresetValues = pointsPresetValues, LicenseKey = licenseKey, UseLocalLicenseServer = useLocalLicenseServer }, input, ref cacheRRtradePannel);
		}
	}
}

namespace NinjaTrader.NinjaScript.MarketAnalyzerColumns
{
	public partial class MarketAnalyzerColumn : MarketAnalyzerColumnBase
	{
		public Indicators.RRtradePannel RRtradePannel(int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues)
		{
			return indicator.RRtradePannel(Input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, string.Empty, true);
		}

		public Indicators.RRtradePannel RRtradePannel(int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.RRtradePannel(Input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, licenseKey, useLocalLicenseServer);
		}

		public Indicators.RRtradePannel RRtradePannel(ISeries<double> input , int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues)
		{
			return indicator.RRtradePannel(input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, string.Empty, true);
		}

		public Indicators.RRtradePannel RRtradePannel(ISeries<double> input , int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.RRtradePannel(input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, licenseKey, useLocalLicenseServer);
		}
	}
}

namespace NinjaTrader.NinjaScript.Strategies
{
	public partial class Strategy : NinjaTrader.Gui.NinjaScript.StrategyRenderBase
	{
		public Indicators.RRtradePannel RRtradePannel(int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues)
		{
			return indicator.RRtradePannel(Input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, string.Empty, true);
		}

		public Indicators.RRtradePannel RRtradePannel(int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.RRtradePannel(Input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, licenseKey, useLocalLicenseServer);
		}

		public Indicators.RRtradePannel RRtradePannel(ISeries<double> input , int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues)
		{
			return indicator.RRtradePannel(input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, string.Empty, true);
		}

		public Indicators.RRtradePannel RRtradePannel(ISeries<double> input , int panelLeft, int panelTop, int boxWidthPixels, string pointsPresetValues, string licenseKey, bool useLocalLicenseServer)
		{
			return indicator.RRtradePannel(input, panelLeft, panelTop, boxWidthPixels, pointsPresetValues, licenseKey, useLocalLicenseServer);
		}
	}
}

#endregion
