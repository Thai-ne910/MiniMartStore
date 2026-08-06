using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniSmartstoreMvc.Data;
using MiniSmartstoreMvc.Models;
using MiniSmartstoreMvc.ViewModels;
using PaymentMethodEnum = MiniSmartstoreMvc.Models.PaymentMethod;
namespace MiniSmartstoreMvc.Controllers
{
    [Authorize]
    public class CheckoutController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        private const string CheckoutNameKey = "CHECKOUT_NAME";
        private const string CheckoutPhoneKey = "CHECKOUT_PHONE";
        private const string CheckoutAddressKey = "CHECKOUT_ADDRESS";
        private const string CheckoutShippingKey = "CHECKOUT_SHIPPING";
        private const string CheckoutShippingFeeKey = "CHECKOUT_SHIPPING_FEE";
        private const string CheckoutPaymentKey = "CHECKOUT_PAYMENT";
        private const string CheckoutNoteKey = "CHECKOUT_NOTE";

        public CheckoutController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        private string GetUserId()
        {
            return _userManager.GetUserId(User) ?? string.Empty;
        }

        private async Task<List<CartItemViewModel>> GetCartItemsAsync()
        {
            var userId = GetUserId();

            var cartItems = await _context.CartItems
                .Include(c => c.Product)
                .ThenInclude(p => p.Category)
                .Where(c => c.UserId == userId)
                .ToListAsync();

            return cartItems.Select(c => new CartItemViewModel
            {
                ProductId = c.ProductId,
                Product = c.Product,
                Quantity = c.Quantity
            }).ToList();
        }

        private async Task<decimal> GetProductsTotalAsync()
        {
            var items = await GetCartItemsAsync();

            return items.Sum(x => (x.Product?.Price ?? 0) * x.Quantity);
        }

        private decimal GetShippingFee()
        {
            var value = HttpContext.Session.GetString(CheckoutShippingFeeKey);

            if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var fee))
            {
                return fee;
            }

            return 0;
        }

        private void SetShippingFee(decimal fee)
        {
            HttpContext.Session.SetString(
                CheckoutShippingFeeKey,
                fee.ToString(CultureInfo.InvariantCulture));
        }

        private string GetShippingMethodName(string method)
        {
            return method switch
            {
                "pickup" => "Nhận hàng tại cửa hàng",
                "standard" => "Giao hàng tiêu chuẩn",
                "express" => "Giao hàng nhanh",
                _ => "Nhận hàng tại cửa hàng"
            };
        }

        public IActionResult Index()
        {
            return RedirectToAction(nameof(BillingAddress));
        }

        [HttpGet]
        public async Task<IActionResult> BillingAddress()
        {
            var cartItems = await GetCartItemsAsync();

            if (!cartItems.Any())
            {
                TempData["Error"] = "Giỏ hàng của bạn đang trống.";
                return RedirectToAction("Index", "Cart");
            }

            var user = await _userManager.GetUserAsync(User);

            var savedName = user?.FullName ?? user?.Email ?? string.Empty;
            var savedEmail = user?.Email ?? string.Empty;
            var savedPhone = user?.PhoneNumber ?? string.Empty;
            var savedAddress = user?.Address ?? string.Empty;

            var hasSavedAddress =
                !string.IsNullOrWhiteSpace(savedName) &&
                !string.IsNullOrWhiteSpace(savedPhone) &&
                !string.IsNullOrWhiteSpace(savedAddress);

            var model = new CheckoutAddressViewModel
            {
                HasSavedAddress = hasSavedAddress,

                SavedCustomerName = savedName,
                SavedEmail = savedEmail,
                SavedPhoneNumber = savedPhone,
                SavedShippingAddress = savedAddress,

                CustomerName = savedName,
                PhoneNumber = savedPhone,
                ShippingAddress = savedAddress
            };

            ViewBag.CheckoutStep = 2;

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult BillingAddress(CheckoutAddressViewModel model, string addressMode)
        {
            ViewBag.CheckoutStep = 2;

            if (addressMode == "saved")
            {
                if (string.IsNullOrWhiteSpace(model.SavedCustomerName) ||
                    string.IsNullOrWhiteSpace(model.SavedPhoneNumber) ||
                    string.IsNullOrWhiteSpace(model.SavedShippingAddress))
                {
                    ModelState.AddModelError("", "Địa chỉ lưu sẵn chưa đầy đủ. Vui lòng thêm địa chỉ mới.");
                    return View(model);
                }

                HttpContext.Session.SetString(CheckoutNameKey, model.SavedCustomerName);
                HttpContext.Session.SetString(CheckoutPhoneKey, model.SavedPhoneNumber);
                HttpContext.Session.SetString(CheckoutAddressKey, model.SavedShippingAddress);

                return RedirectToAction(nameof(ShippingMethod));
            }

            model.UseNewAddress = true;

            if (string.IsNullOrWhiteSpace(model.CustomerName))
            {
                ModelState.AddModelError(nameof(model.CustomerName), "Vui lòng nhập họ tên");
            }

            if (string.IsNullOrWhiteSpace(model.PhoneNumber))
            {
                ModelState.AddModelError(nameof(model.PhoneNumber), "Vui lòng nhập số điện thoại");
            }

            if (string.IsNullOrWhiteSpace(model.ShippingAddress))
            {
                ModelState.AddModelError(nameof(model.ShippingAddress), "Vui lòng nhập địa chỉ nhận hàng");
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            HttpContext.Session.SetString(CheckoutNameKey, model.CustomerName);
            HttpContext.Session.SetString(CheckoutPhoneKey, model.PhoneNumber);
            HttpContext.Session.SetString(CheckoutAddressKey, model.ShippingAddress);

            return RedirectToAction(nameof(ShippingMethod));
        }

        [HttpGet]
        public async Task<IActionResult> ShippingMethod()
        {
            var total = await GetProductsTotalAsync();

            var selected = HttpContext.Session.GetString(CheckoutShippingKey) ?? "pickup";

            var model = new CheckoutShippingViewModel
            {
                SelectedShippingMethod = selected,
                ProductsTotal = total,
                ShippingFee = GetShippingFee()
            };

            ViewBag.CheckoutStep = 3;

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult ShippingMethod(string selectedShippingMethod)
        {
            decimal fee = selectedShippingMethod switch
            {
                "standard" => 30000,
                "express" => 60000,
                _ => 0
            };

            HttpContext.Session.SetString(CheckoutShippingKey, selectedShippingMethod);
            SetShippingFee(fee);

            return RedirectToAction(nameof(PaymentMethod));
        }

        [HttpGet]
        public async Task<IActionResult> PaymentMethod()
        {
            var total = await GetProductsTotalAsync();

            var paymentString = HttpContext.Session.GetString(CheckoutPaymentKey);

            var paymentMethod = PaymentMethodEnum.CashOnDelivery;

            if (Enum.TryParse(paymentString, out PaymentMethodEnum  parsed))
            {
                paymentMethod = parsed;
            }

            var model = new CheckoutPaymentViewModel
            {
                SelectedPaymentMethod = paymentMethod,
                ProductsTotal = total,
                ShippingFee = GetShippingFee()
            };

            ViewBag.CheckoutStep = 4;

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult PaymentMethod(PaymentMethodEnum selectedPaymentMethod)
        {
            HttpContext.Session.SetString(CheckoutPaymentKey, selectedPaymentMethod.ToString());

            return RedirectToAction(nameof(Confirm));
        }

        [HttpGet]
        public async Task<IActionResult> Confirm()
        {
            var cartItems = await GetCartItemsAsync();

            if (!cartItems.Any())
            {
                TempData["Error"] = "Giỏ hàng của bạn đang trống.";
                return RedirectToAction("Index", "Cart");
            }

            var paymentString = HttpContext.Session.GetString(CheckoutPaymentKey);

            var paymentMethod = PaymentMethodEnum.CashOnDelivery;

            if (Enum.TryParse(paymentString, out PaymentMethodEnum parsed))
            {
                paymentMethod = parsed;
            }

            var shippingMethod = HttpContext.Session.GetString(CheckoutShippingKey) ?? "pickup";

            var model = new CheckoutConfirmViewModel
            {
                CustomerName = HttpContext.Session.GetString(CheckoutNameKey) ?? string.Empty,
                PhoneNumber = HttpContext.Session.GetString(CheckoutPhoneKey) ?? string.Empty,
                ShippingAddress = HttpContext.Session.GetString(CheckoutAddressKey) ?? string.Empty,
                ShippingMethodName = GetShippingMethodName(shippingMethod),
                PaymentMethod = paymentMethod,
                CartItems = cartItems,
                ProductsTotal = cartItems.Sum(x => (x.Product?.Price ?? 0) * x.Quantity),
                ShippingFee = GetShippingFee()
            };

            ViewBag.CheckoutStep = 5;

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> PlaceOrder(string? orderNote)
        {
            var userId = GetUserId();

            var cartItems = await _context.CartItems
                .Include(c => c.Product)
                .Where(c => c.UserId == userId)
                .ToListAsync();

            if (!cartItems.Any())
            {
                TempData["Error"] = "Giỏ hàng của bạn đang trống.";
                return RedirectToAction("Index", "Cart");
            }

            var paymentString = HttpContext.Session.GetString(CheckoutPaymentKey);

            var paymentMethod = PaymentMethodEnum.CashOnDelivery;

            if (Enum.TryParse(paymentString, out PaymentMethodEnum parsed))
            {
                paymentMethod = parsed;
            }

            var productsTotal = cartItems.Sum(x => (x.Product?.Price ?? 0) * x.Quantity);
            var shippingFee = GetShippingFee();
            var total = productsTotal + shippingFee;

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var order = new Order
                {
                    UserId = userId,
                    CustomerName = HttpContext.Session.GetString(CheckoutNameKey) ?? "Khách hàng",
                    PhoneNumber = HttpContext.Session.GetString(CheckoutPhoneKey) ?? string.Empty,
                    ShippingAddress = HttpContext.Session.GetString(CheckoutAddressKey) ?? string.Empty,
                    TotalAmount = total,
                    PaymentMethod = paymentMethod,
                    PaymentStatus = PaymentStatus.Pending,
                    OrderStatus = OrderStatus.Pending,
                    CreatedAt = DateTime.Now,
                    OrderDetails = new List<OrderDetail>()
                };

                foreach (var item in cartItems)
                {
                    if (item.Product == null)
                    {
                        continue;
                    }

                    if (item.Product.StockQuantity < item.Quantity)
                    {
                        TempData["Error"] = $"Sản phẩm {item.Product.Name} không đủ tồn kho.";
                        return RedirectToAction("Index", "Cart");
                    }

                    item.Product.StockQuantity -= item.Quantity;

                    order.OrderDetails.Add(new OrderDetail
                    {
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        UnitPrice = item.Product.Price
                    });
                }

                order.Payment = new Payment
                {
                    PaymentMethod = paymentMethod,
                    PaymentStatus = PaymentStatus.Pending,
                    Amount = total,
                    CreatedAt = DateTime.Now
                };

                await _context.Orders.AddAsync(order);
                _context.CartItems.RemoveRange(cartItems);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                ClearCheckoutSession();

                return RedirectToAction(nameof(Completed), new { id = order.Id });
            }
            catch
            {
                await transaction.RollbackAsync();

                TempData["Error"] = "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.";
                return RedirectToAction(nameof(Confirm));
            }
        }

        [HttpGet]
        public async Task<IActionResult> Completed(int id)
        {
            var userId = GetUserId();

            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

            if (order == null)
            {
                return NotFound();
            }

            ViewBag.CheckoutStep = 6;

            return View(order);
        }

        private void ClearCheckoutSession()
        {
            HttpContext.Session.Remove(CheckoutNameKey);
            HttpContext.Session.Remove(CheckoutPhoneKey);
            HttpContext.Session.Remove(CheckoutAddressKey);
            HttpContext.Session.Remove(CheckoutShippingKey);
            HttpContext.Session.Remove(CheckoutShippingFeeKey);
            HttpContext.Session.Remove(CheckoutPaymentKey);
            HttpContext.Session.Remove(CheckoutNoteKey);
        }
    }
}