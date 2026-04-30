#region Using declarations
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using NinjaTrader.Cbi;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Tools;
using NinjaTrader.NinjaScript;
#endregion

namespace NinjaTrader.NinjaScript.AddOns
{
    public class DailyAccountLockAddOn : AddOnBase
    {
        private const string ProductDisplayName = "GG Daily Account Lock AddOn";
        private const string LocalLicenseServerUrl = "http://127.0.0.1:3000/api/verify-license";
        private const string ProductionLicenseServerUrl = "https://goodgainsindicators.com/api/verify-license";
        private const int LicenseRequestTimeoutMs = 5000;
        private readonly Dictionary<string, LockState> lockStates = new Dictionary<string, LockState>(StringComparer.OrdinalIgnoreCase);
        private readonly HashSet<Account> subscribedAccounts = new HashSet<Account>();
        private readonly HashSet<string> cancelRequestedOrderIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        private readonly TimeZoneInfo localTimeZone = ResolveIsraelTimeZone();

        private DispatcherTimer refreshTimer;
        private DailyAccountLockWindow window;
        private NTMenuItem controlCenterNewMenu;
        private NTMenuItem openWindowMenuItem;
        private string stateFilePath;
        private string licenseSettingsFilePath;
        private bool licenseValidated;
        private bool licenseIsValid;
        private bool lastValidatedUseLocalLicenseServer;
        private string licenseStatusMessage;
        private string lastValidatedLicenseKey;

        public string LicenseKey { get; set; }
        public bool UseLocalLicenseServer { get; set; }

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name = "DailyAccountLockAddOn";
                Description = "Manual daily trading lock for selected NinjaTrader accounts.";
                LicenseKey = string.Empty;
                UseLocalLicenseServer = true;
                licenseValidated = false;
                licenseIsValid = false;
                licenseStatusMessage = string.Empty;
                lastValidatedLicenseKey = string.Empty;
                lastValidatedUseLocalLicenseServer = UseLocalLicenseServer;
            }
            else if (State == State.Active)
            {
                InitializeStateFilePath();
                InitializeLicenseSettingsFilePath();
                LoadLicenseSettings();
                ValidateLicenseStatus();
                LoadLockStates();
                ResetExpiredLocks();
                SubscribeAccounts();
                StartRefreshTimer();
                Application.Current?.Dispatcher?.InvokeAsync(AttachMenuToOpenControlCenters);
            }
            else if (State == State.Terminated)
            {
                SaveLockStates();
                SaveLicenseSettings();
                StopRefreshTimer();
                CloseWindow();
                UnsubscribeAccounts();
            }
        }

        protected override void OnWindowCreated(Window window)
        {
            base.OnWindowCreated(window);
            AttachMenuToControlCenter(window as ControlCenter);
        }

        protected override void OnWindowDestroyed(Window window)
        {
            if (window is ControlCenter && openWindowMenuItem != null)
            {
                if (controlCenterNewMenu != null && controlCenterNewMenu.Items.Contains(openWindowMenuItem))
                    controlCenterNewMenu.Items.Remove(openWindowMenuItem);

                openWindowMenuItem.Click -= OnOpenWindowMenuItemClick;
                openWindowMenuItem = null;
                controlCenterNewMenu = null;
            }

            base.OnWindowDestroyed(window);
        }

        private void StartRefreshTimer()
        {
            if (refreshTimer != null)
                return;

            refreshTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            refreshTimer.Tick += OnRefreshTimerTick;
            refreshTimer.Start();
        }

        private void StopRefreshTimer()
        {
            if (refreshTimer == null)
                return;

            refreshTimer.Stop();
            refreshTimer.Tick -= OnRefreshTimerTick;
            refreshTimer = null;
        }

        private void OnOpenWindowMenuItemClick(object sender, RoutedEventArgs e)
        {
            Application.Current?.Dispatcher?.InvokeAsync(ShowWindow);
        }

        private void AttachMenuToOpenControlCenters()
        {
            if (Application.Current == null)
                return;

            foreach (Window openWindow in Application.Current.Windows)
                AttachMenuToControlCenter(openWindow as ControlCenter);
        }

        private void AttachMenuToControlCenter(ControlCenter controlCenter)
        {
            if (controlCenter == null || openWindowMenuItem != null)
                return;

            controlCenterNewMenu = controlCenter.FindFirst("ControlCenterMenuItemNew") as NTMenuItem;
            if (controlCenterNewMenu == null)
                return;

            openWindowMenuItem = new NTMenuItem
            {
                Header = "Daily Account Lock",
                Style = Application.Current.TryFindResource("MainMenuItem") as Style
            };
            openWindowMenuItem.Click += OnOpenWindowMenuItemClick;
            controlCenterNewMenu.Items.Add(openWindowMenuItem);
        }

        private void ShowWindow()
        {
            if (window != null)
            {
                window.Activate();
                window.RefreshRows();
                return;
            }

            window = new DailyAccountLockWindow(this);
            window.Closed += OnWindowClosed;
            window.Show();
            window.RefreshRows();
        }

        private void CloseWindow()
        {
            if (window == null)
                return;

            DailyAccountLockWindow oldWindow = window;
            window = null;
            oldWindow.Closed -= OnWindowClosed;
            oldWindow.Close();
        }

        private void OnWindowClosed(object sender, EventArgs e)
        {
            if (window != null)
                window.Closed -= OnWindowClosed;

            window = null;
        }

        private void OnRefreshTimerTick(object sender, EventArgs e)
        {
            ResetExpiredLocks();

            if (!IsLicenseCurrentlyValid())
            {
                window?.RefreshRows();
                return;
            }

            foreach (Account account in GetAccounts())
            {
                LockState state = GetOrCreateState(account);
                if (!IsLockedToday(state))
                    continue;

                CancelWorkingOrders(account);

                if (HasOpenPositions(account))
                {
                    state.CleanupInProgress = true;
                    state.LastReason = "Locked - position still open, retrying flatten";
                    FlattenOpenPositions(account);
                    continue;
                }

                state.CleanupInProgress = false;
                state.BlockOrdersAfter = Core.Globals.Now;
                if (HasWorkingOrders(account))
                    state.LastReason = "Locked and flat - cancelling leftover orders";
                else if (string.IsNullOrWhiteSpace(state.LastReason) || state.LastReason.StartsWith("Locked -", StringComparison.OrdinalIgnoreCase))
                    state.LastReason = "Locked and flat";
            }

            window?.RefreshRows();
        }

        private void SubscribeAccounts()
        {
            lock (Account.All)
            {
                foreach (Account account in Account.All.Where(a => a != null))
                    SubscribeAccount(account);
            }
        }

        private void SubscribeAccount(Account account)
        {
            if (account == null || subscribedAccounts.Contains(account))
                return;

            account.OrderUpdate += OnAccountOrderUpdate;
            account.ExecutionUpdate += OnAccountExecutionUpdate;
            subscribedAccounts.Add(account);
            HydrateLoadedState(account);
        }

        private void UnsubscribeAccounts()
        {
            foreach (Account account in subscribedAccounts.ToList())
            {
                try
                {
                    account.OrderUpdate -= OnAccountOrderUpdate;
                    account.ExecutionUpdate -= OnAccountExecutionUpdate;
                }
                catch
                {
                }
            }

            subscribedAccounts.Clear();
            cancelRequestedOrderIds.Clear();
        }

        private void OnAccountOrderUpdate(object sender, OrderEventArgs e)
        {
            if (!IsLicenseCurrentlyValid())
                return;

            if (e == null || e.Order == null)
                return;

            Account account = sender as Account;
            if (account == null)
                return;

            LockState state = GetOrCreateState(account);
            if (!IsLockedToday(state))
                return;

            if (e.Order.OrderState == OrderState.Cancelled ||
                e.Order.OrderState == OrderState.Filled ||
                e.Order.OrderState == OrderState.Rejected)
                return;

            if (IsClosingOrder(account, e.Order))
                return;

            string orderId = e.Order.OrderId ?? string.Empty;
            if (string.IsNullOrWhiteSpace(orderId) || cancelRequestedOrderIds.Contains(orderId))
                return;

            cancelRequestedOrderIds.Add(orderId);

            try
            {
                account.Cancel(new[] { e.Order });
            }
            catch
            {
            }
        }

        private void OnAccountExecutionUpdate(object sender, ExecutionEventArgs e)
        {
            if (!IsLicenseCurrentlyValid())
                return;

            if (e == null || e.Execution == null)
                return;

            Account account = sender as Account;
            if (account == null)
                return;

            LockState state = GetOrCreateState(account);
            if (!IsLockedToday(state))
                return;

            try
            {
                CancelWorkingOrders(account);
                FlattenOpenPositions(account);
            }
            catch
            {
            }
        }

        internal List<Account> GetAccounts()
        {
            List<Account> connectedAccounts = new List<Account>();

            lock (Connection.Connections)
            {
                foreach (Connection connection in Connection.Connections.Where(c => c != null))
                {
                    bool orderConnected = connection.Status == ConnectionStatus.Connected || connection.Status == ConnectionStatus.Connecting;
                    bool priceConnected = connection.PriceStatus == ConnectionStatus.Connected || connection.PriceStatus == ConnectionStatus.Connecting;
                    if (!orderConnected && !priceConnected)
                        continue;

                    foreach (Account account in connection.Accounts.Where(a => a != null))
                    {
                        if (!connectedAccounts.Any(a => string.Equals(a.Name, account.Name, StringComparison.OrdinalIgnoreCase)))
                            connectedAccounts.Add(account);
                    }
                }
            }

            return connectedAccounts.OrderBy(a => a.Name).ToList();
        }

        internal LockState GetOrCreateState(Account account)
        {
            string key = account?.Name ?? string.Empty;
            if (string.IsNullOrWhiteSpace(key))
                key = Guid.NewGuid().ToString("N");

            if (!lockStates.TryGetValue(key, out LockState state))
            {
                state = new LockState
                {
                    AccountName = account?.Name ?? "Unknown",
                    LockDate = DateTime.MinValue,
                    LastReason = string.Empty,
                    BlockOrdersAfter = DateTime.MinValue,
                    CleanupInProgress = false
                };
                lockStates[key] = state;
            }

            return state;
        }

        private void HydrateLoadedState(Account account)
        {
            if (account == null || string.IsNullOrWhiteSpace(account.Name))
                return;

            if (lockStates.TryGetValue(account.Name, out LockState existing))
            {
                existing.AccountName = account.Name;
                return;
            }

            GetOrCreateState(account);
        }

        internal double GetNetPnL(Account account)
        {
            if (account == null)
                return 0;

            double realized = 0;
            double unrealized = 0;

            try
            {
                realized = account.Get(AccountItem.RealizedProfitLoss, Currency.UsDollar);
            }
            catch
            {
            }

            try
            {
                unrealized = account.Get(AccountItem.UnrealizedProfitLoss, Currency.UsDollar);
            }
            catch
            {
            }

            return realized + unrealized;
        }

        internal bool IsLockedToday(LockState state)
        {
            return state != null && state.IsLocked && state.LockDate.Date == GetLocalTradingDate();
        }

        internal void LockAccountForToday(Account account, string reason)
        {
            if (!EnsureLicenseAllowsActions())
                return;

            if (account == null)
                return;

            LockState state = GetOrCreateState(account);
            state.IsLocked = true;
            state.LockDate = GetLocalTradingDate();
            state.BlockOrdersAfter = DateTime.MaxValue;
            state.CleanupInProgress = true;
            state.LastReason = string.IsNullOrWhiteSpace(reason) ? "Locked manually" : reason;

            CancelWorkingOrders(account);
            FlattenOpenPositions(account);
            SaveLockStates();
        }

        private void ResetExpiredLocks()
        {
            DateTime currentUsDate = GetLocalTradingDate();
            bool changed = false;
            foreach (LockState state in lockStates.Values)
            {
                if (!state.IsLocked || state.LockDate.Date >= currentUsDate)
                    continue;

                state.IsLocked = false;
                state.CleanupInProgress = false;
                state.BlockOrdersAfter = DateTime.MinValue;
                state.LastReason = "New day";
                changed = true;
            }

            if (changed)
                SaveLockStates();
        }

        private DateTime GetLocalTradingDate()
        {
            DateTime utcNow = Core.Globals.Now.ToUniversalTime();
            DateTime localNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow, localTimeZone);
            return localNow.Date;
        }

        private static TimeZoneInfo ResolveIsraelTimeZone()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Israel Standard Time");
            }
            catch
            {
                return TimeZoneInfo.Local;
            }
        }

        private void CancelWorkingOrders(Account account)
        {
            if (!IsLicenseCurrentlyValid())
                return;

            if (account == null)
                return;

            try
            {
                List<Order> ordersToCancel = account.Orders
                    .Where(o => o != null
                        && !string.IsNullOrWhiteSpace(o.OrderId)
                        && o.OrderState != OrderState.Cancelled
                        && o.OrderState != OrderState.Filled
                        && o.OrderState != OrderState.Rejected)
                    .ToList();

                if (ordersToCancel.Count == 0)
                    return;

                foreach (Order order in ordersToCancel)
                    cancelRequestedOrderIds.Add(order.OrderId);

                account.Cancel(ordersToCancel.ToArray());

                foreach (Instrument instrument in ordersToCancel
                    .Where(o => o.Instrument != null)
                    .Select(o => o.Instrument)
                    .GroupBy(i => i.FullName)
                    .Select(g => g.First()))
                {
                    try
                    {
                        account.CancelAllOrders(instrument);
                    }
                    catch
                    {
                    }
                }
            }
            catch
            {
            }
        }

        private void FlattenOpenPositions(Account account)
        {
            if (!IsLicenseCurrentlyValid())
                return;

            if (account == null)
                return;

            try
            {
                Collection<Instrument> instruments = new Collection<Instrument>();

                foreach (Position position in account.Positions)
                {
                    if (position == null || position.Instrument == null || position.MarketPosition == MarketPosition.Flat)
                        continue;

                    if (!instruments.Any(i => i != null && i.FullName == position.Instrument.FullName))
                        instruments.Add(position.Instrument);
                }

                if (instruments.Count > 0)
                    account.Flatten(instruments);
            }
            catch
            {
            }
        }

        private bool HasOpenPositions(Account account)
        {
            if (account == null)
                return false;

            try
            {
                return account.Positions.Any(p => p != null && p.MarketPosition != MarketPosition.Flat);
            }
            catch
            {
                return false;
            }
        }

        private bool HasWorkingOrders(Account account)
        {
            if (account == null)
                return false;

            try
            {
                return account.Orders.Any(o =>
                    o != null &&
                    o.OrderState != OrderState.Cancelled &&
                    o.OrderState != OrderState.Filled &&
                    o.OrderState != OrderState.Rejected);
            }
            catch
            {
                return false;
            }
        }

        private bool IsClosingOrder(Account account, Order order)
        {
            if (account == null || order == null || order.Instrument == null)
                return false;

            try
            {
                Position position = account.Positions.FirstOrDefault(p => p != null && p.Instrument != null && p.Instrument.FullName == order.Instrument.FullName);
                if (position == null || position.MarketPosition == MarketPosition.Flat)
                    return false;

                if (position.MarketPosition == MarketPosition.Long)
                    return order.OrderAction == OrderAction.Sell;

                if (position.MarketPosition == MarketPosition.Short)
                    return order.OrderAction == OrderAction.BuyToCover;
            }
            catch
            {
            }

            return false;
        }

        internal void FlattenAll(Account account)
        {
            if (!EnsureLicenseAllowsActions())
                return;

            CancelWorkingOrders(account);
            FlattenOpenPositions(account);
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
                ? "License active for GG Daily Account Lock AddOn."
                : (string.IsNullOrWhiteSpace(message)
                    ? "Invalid or missing license key for GG Daily Account Lock AddOn."
                    : message);

            window?.RefreshRows();
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
                SetLicenseState(false, "Invalid or missing license key for GG Daily Account Lock AddOn.");
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
                        isValid ? "License active for GG Daily Account Lock AddOn." : "Invalid or missing license key for GG Daily Account Lock AddOn.");
                }
            }
            catch (Exception ex)
            {
                Print(ProductDisplayName + " license validation failed: " + ex.Message);
                SetLicenseState(false, "Invalid or missing license key for GG Daily Account Lock AddOn.");
            }
        }

        internal bool IsLicenseCurrentlyValid()
        {
            ValidateLicenseStatus();
            return licenseValidated && licenseIsValid;
        }

        internal bool EnsureLicenseAllowsActions()
        {
            if (IsLicenseCurrentlyValid())
                return true;

            window?.RefreshRows();
            return false;
        }

        internal string GetLicenseStatusMessage()
        {
            ValidateLicenseStatus();
            return string.IsNullOrWhiteSpace(licenseStatusMessage)
                ? "Invalid or missing license key for GG Daily Account Lock AddOn."
                : licenseStatusMessage;
        }

        internal void UpdateLicenseKey(string value)
        {
            LicenseKey = value ?? string.Empty;
            licenseValidated = false;
            SaveLicenseSettings();
            ValidateLicenseStatus();
        }

        internal string GetLicenseKeyValue()
        {
            return LicenseKey ?? string.Empty;
        }

        private void InitializeStateFilePath()
        {
            if (!string.IsNullOrWhiteSpace(stateFilePath))
                return;

            string customDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                "NinjaTrader 8",
                "bin",
                "Custom");

            Directory.CreateDirectory(customDir);
            stateFilePath = Path.Combine(customDir, "DailyAccountLockState.csv");
        }

        private void InitializeLicenseSettingsFilePath()
        {
            if (!string.IsNullOrWhiteSpace(licenseSettingsFilePath))
                return;

            string customDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
                "NinjaTrader 8",
                "bin",
                "Custom");

            Directory.CreateDirectory(customDir);
            licenseSettingsFilePath = Path.Combine(customDir, "DailyAccountLockLicense.txt");
        }

        private void LoadLicenseSettings()
        {
            if (string.IsNullOrWhiteSpace(licenseSettingsFilePath) || !File.Exists(licenseSettingsFilePath))
                return;

            try
            {
                string[] lines = File.ReadAllLines(licenseSettingsFilePath);
                if (lines.Length > 0)
                    LicenseKey = lines[0] ?? string.Empty;

                bool parsedUseLocal;
                if (lines.Length > 1 && bool.TryParse(lines[1], out parsedUseLocal))
                    UseLocalLicenseServer = parsedUseLocal;
            }
            catch
            {
            }
        }

        private void SaveLicenseSettings()
        {
            if (string.IsNullOrWhiteSpace(licenseSettingsFilePath))
                return;

            try
            {
                File.WriteAllLines(
                    licenseSettingsFilePath,
                    new[]
                    {
                        LicenseKey ?? string.Empty,
                        UseLocalLicenseServer.ToString()
                    });
            }
            catch
            {
            }
        }

        private void LoadLockStates()
        {
            if (string.IsNullOrWhiteSpace(stateFilePath) || !File.Exists(stateFilePath))
                return;

            try
            {
                foreach (string line in File.ReadAllLines(stateFilePath))
                {
                    if (string.IsNullOrWhiteSpace(line))
                        continue;

                    string[] parts = line.Split('|');
                    if (parts.Length < 5)
                        continue;

                    string accountName = parts[0];
                    if (string.IsNullOrWhiteSpace(accountName))
                        continue;

                    DateTime lockDate;
                    if (!DateTime.TryParse(parts[2], out lockDate))
                        lockDate = DateTime.MinValue;

                    DateTime blockAfter;
                    if (!DateTime.TryParse(parts[3], out blockAfter))
                        blockAfter = DateTime.MinValue;

                    string reason = string.Empty;
                    try
                    {
                        reason = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(parts[4]));
                    }
                    catch
                    {
                        reason = string.Empty;
                    }

                    lockStates[accountName] = new LockState
                    {
                        AccountName = accountName,
                        IsLocked = string.Equals(parts[1], "1", StringComparison.Ordinal),
                        LockDate = lockDate,
                        BlockOrdersAfter = blockAfter,
                        CleanupInProgress = false,
                        LastReason = reason
                    };
                }
            }
            catch
            {
            }
        }

        private void SaveLockStates()
        {
            if (string.IsNullOrWhiteSpace(stateFilePath))
                return;

            try
            {
                List<string> lines = new List<string>();
                foreach (LockState state in lockStates.Values.Where(s => s != null && !string.IsNullOrWhiteSpace(s.AccountName)))
                {
                    string reason = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(state.LastReason ?? string.Empty));
                    lines.Add(string.Join("|",
                        state.AccountName,
                        state.IsLocked ? "1" : "0",
                        state.LockDate.ToString("o"),
                        state.BlockOrdersAfter.ToString("o"),
                        reason));
                }

                File.WriteAllLines(stateFilePath, lines);
            }
            catch
            {
            }
        }

        internal sealed class LockState
        {
            public string AccountName { get; set; }
            public bool IsLocked { get; set; }
            public DateTime LockDate { get; set; }
            public string LastReason { get; set; }
            public DateTime BlockOrdersAfter { get; set; }
            public bool CleanupInProgress { get; set; }
        }

        internal sealed class DailyAccountLockWindow : Window
        {
            private readonly DailyAccountLockAddOn owner;
            private readonly StackPanel rowsPanel;
            private readonly TextBox licenseKeyTextBox;
            private readonly TextBlock licenseStatusText;

            public DailyAccountLockWindow(DailyAccountLockAddOn owner)
            {
                this.owner = owner;

                Title = "Daily Account Lock";
                Width = 620;
                Height = 520;
                MinWidth = 520;
                MinHeight = 360;
                WindowStartupLocation = WindowStartupLocation.CenterScreen;
                Background = new SolidColorBrush(Color.FromRgb(28, 28, 28));
                Foreground = Brushes.White;

                DockPanel root = new DockPanel
                {
                    Margin = new Thickness(12)
                };

                TextBlock licenseLabel = new TextBlock
                {
                    Text = "License Key",
                    Margin = new Thickness(0, 0, 0, 6),
                    Foreground = Brushes.Gainsboro
                };
                DockPanel.SetDock(licenseLabel, Dock.Top);
                root.Children.Add(licenseLabel);

                Grid licenseGrid = new Grid
                {
                    Margin = new Thickness(0, 0, 0, 10)
                };
                licenseGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                licenseGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                licenseKeyTextBox = new TextBox
                {
                    Text = owner.GetLicenseKeyValue(),
                    Height = 26,
                    MinWidth = 320,
                    Margin = new Thickness(0, 0, 8, 0)
                };

                Button applyLicenseButton = new Button
                {
                    Content = "Apply License",
                    MinWidth = 110,
                    Height = 26
                };
                applyLicenseButton.Click += (s, e) =>
                {
                    owner.UpdateLicenseKey(licenseKeyTextBox.Text);
                    RefreshRows();
                };

                Grid.SetColumn(licenseKeyTextBox, 0);
                Grid.SetColumn(applyLicenseButton, 1);
                licenseGrid.Children.Add(licenseKeyTextBox);
                licenseGrid.Children.Add(applyLicenseButton);
                DockPanel.SetDock(licenseGrid, Dock.Top);
                root.Children.Add(licenseGrid);

                licenseStatusText = new TextBlock
                {
                    TextWrapping = TextWrapping.Wrap,
                    Margin = new Thickness(0, 0, 0, 10)
                };
                DockPanel.SetDock(licenseStatusText, Dock.Top);
                root.Children.Add(licenseStatusText);

                TextBlock info = new TextBlock
                {
                    Text = "Lock Today cancels working orders, flattens open positions, and blocks new entry orders for the rest of the US trading day.",
                    TextWrapping = TextWrapping.Wrap,
                    Margin = new Thickness(0, 0, 0, 10),
                    Foreground = Brushes.Gainsboro
                };
                DockPanel.SetDock(info, Dock.Top);
                root.Children.Add(info);

                Button refreshButton = new Button
                {
                    Content = "Refresh",
                    Width = 84,
                    Margin = new Thickness(0, 0, 0, 10),
                    HorizontalAlignment = HorizontalAlignment.Left
                };
                refreshButton.Click += (s, e) => RefreshRows();
                DockPanel.SetDock(refreshButton, Dock.Top);
                root.Children.Add(refreshButton);

                ScrollViewer scroll = new ScrollViewer
                {
                    VerticalScrollBarVisibility = ScrollBarVisibility.Auto
                };

                rowsPanel = new StackPanel();
                scroll.Content = rowsPanel;
                root.Children.Add(scroll);

                Content = root;
            }

            public void RefreshRows()
            {
                RefreshLicenseUi();
                rowsPanel.Children.Clear();

                foreach (Account account in owner.GetAccounts())
                    rowsPanel.Children.Add(CreateAccountRow(account));
            }

            private void RefreshLicenseUi()
            {
                bool isLicenseValid = owner.IsLicenseCurrentlyValid();

                if (licenseKeyTextBox != null && !licenseKeyTextBox.IsKeyboardFocused)
                    licenseKeyTextBox.Text = owner.GetLicenseKeyValue();

                if (licenseStatusText != null)
                {
                    licenseStatusText.Text = owner.GetLicenseStatusMessage();
                    licenseStatusText.Foreground = isLicenseValid ? Brushes.LightGreen : Brushes.OrangeRed;
                }
            }

            private UIElement CreateAccountRow(Account account)
            {
                LockState state = owner.GetOrCreateState(account);
                double pnl = owner.GetNetPnL(account);
                bool isLocked = owner.IsLockedToday(state);
                bool hasOpenPositions = owner.HasOpenPositions(account);
                bool isLicenseValid = owner.IsLicenseCurrentlyValid();

                Brush cardBackground = new SolidColorBrush(Color.FromRgb(36, 36, 36));
                Brush statusBrush = Brushes.LightGreen;
                string statusText = "OPEN";

                if (isLocked && hasOpenPositions)
                {
                    cardBackground = new SolidColorBrush(Color.FromRgb(70, 28, 28));
                    statusBrush = Brushes.OrangeRed;
                    statusText = "LOCKED - POSITION OPEN";
                }
                else if (isLocked)
                {
                    cardBackground = new SolidColorBrush(Color.FromRgb(55, 28, 28));
                    statusBrush = Brushes.OrangeRed;
                    statusText = "LOCKED";
                }

                Border border = new Border
                {
                    BorderBrush = new SolidColorBrush(Color.FromRgb(70, 70, 70)),
                    BorderThickness = new Thickness(1),
                    Margin = new Thickness(0, 0, 0, 10),
                    Padding = new Thickness(10),
                    Background = cardBackground
                };

                Grid grid = new Grid();
                grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
                grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(190) });
                grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(110) });
                grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
                grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(120) });

                TextBlock name = new TextBlock
                {
                    Text = account.Name,
                    FontSize = 16,
                    FontWeight = FontWeights.SemiBold,
                    VerticalAlignment = VerticalAlignment.Center
                };
                Grid.SetRow(name, 0);
                Grid.SetColumn(name, 0);
                grid.Children.Add(name);

                TextBlock status = new TextBlock
                {
                    Text = statusText,
                    Foreground = statusBrush,
                    VerticalAlignment = VerticalAlignment.Center
                };
                Grid.SetRow(status, 0);
                Grid.SetColumn(status, 1);
                grid.Children.Add(status);

                TextBlock pnlText = new TextBlock
                {
                    Text = "Daily PnL: $" + pnl.ToString("0.##"),
                    Foreground = pnl >= 0 ? Brushes.LightGreen : Brushes.Salmon,
                    VerticalAlignment = VerticalAlignment.Center
                };
                Grid.SetRow(pnlText, 0);
                Grid.SetColumn(pnlText, 2);
                grid.Children.Add(pnlText);

                StackPanel actionButtons = new StackPanel
                {
                    Orientation = Orientation.Vertical,
                    VerticalAlignment = VerticalAlignment.Center,
                    HorizontalAlignment = HorizontalAlignment.Center
                };

                Button lockButton = new Button
                {
                    Content = "Lock Today",
                    Margin = new Thickness(0, 0, 0, 8),
                    MinWidth = 110,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    IsEnabled = isLicenseValid && !isLocked
                };
                lockButton.Click += (s, e) =>
                {
                    owner.LockAccountForToday(account, "Locked manually");
                    RefreshRows();
                };
                actionButtons.Children.Add(lockButton);

                Button flattenButton = new Button
                {
                    Content = "Flatten All",
                    MinWidth = 110,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    IsEnabled = isLicenseValid
                };
                flattenButton.Click += (s, e) =>
                {
                    owner.FlattenAll(account);
                    RefreshRows();
                };
                actionButtons.Children.Add(flattenButton);

                Grid.SetRow(actionButtons, 0);
                Grid.SetRowSpan(actionButtons, 4);
                Grid.SetColumn(actionButtons, 3);
                grid.Children.Add(actionButtons);

                TextBlock positionText = new TextBlock
                {
                    Text = hasOpenPositions ? "Open position detected" : "Flat",
                    Foreground = hasOpenPositions ? Brushes.Gold : Brushes.Gainsboro,
                    Margin = new Thickness(0, 10, 0, 0)
                };
                Grid.SetRow(positionText, 1);
                Grid.SetColumn(positionText, 0);
                Grid.SetColumnSpan(positionText, 2);
                grid.Children.Add(positionText);

                TextBlock cleanupText = new TextBlock
                {
                    Text = isLocked ? "Locked" : "Ready",
                    Foreground = isLocked ? Brushes.Gainsboro : Brushes.Gainsboro,
                    Margin = new Thickness(0, 10, 0, 0)
                };
                Grid.SetRow(cleanupText, 1);
                Grid.SetColumn(cleanupText, 2);
                grid.Children.Add(cleanupText);

                TextBlock reason = new TextBlock
                {
                    Text = string.IsNullOrWhiteSpace(state.LastReason) ? "Reason: -" : "Reason: " + state.LastReason,
                    Foreground = Brushes.Gainsboro,
                    Margin = new Thickness(0, 10, 0, 0),
                    TextWrapping = TextWrapping.Wrap
                };
                Grid.SetRow(reason, 2);
                Grid.SetColumn(reason, 0);
                Grid.SetColumnSpan(reason, 3);
                grid.Children.Add(reason);

                border.Child = grid;
                return border;
            }
        }
    }
}
