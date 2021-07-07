class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      console.log("event", event);
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
      .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

    this.debouncedOnChange = debounce((event) => {
      console.trace("debouncedOnChange event: ",event);
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    console.log("trace: ", event);
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      }
    ];
  }

  // Updates the quantity of the cart when the quantity input is changed //
  // ? But, does it update the Cart db too! ? //
  updateQuantity(line, quantity, name) {
    console.log("updateQuantity args: ", line, quantity, name);
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    });

    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => {
        console.log("response: ", response.text());
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        console.log("parsed state: ", parsedState);
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        document.getElementById('main-cart-footer')?.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

          elementToReplace.innerHTML =
            this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
        }));

        this.updateLiveRegions(line, parsedState.item_count);
        document.getElementById(`CartItem-${line}`)?.querySelector(`[name="${name}"]`)?.focus();
        this.disableLoading();
      })
      .catch(() => {
        this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
        document.getElementById('cart-errors').textContent = window.cartStrings.error;
        this.disableLoading();
      });
  }

  updateLiveRegions(line, itemCount) {
    console.log("update live regions args: ", line, itemCount);
    if (this.currentItemCount === itemCount) {
      document.getElementById(`Line-item-error-${line}`)
        .querySelector('.cart-item__error-text')
        .innerHTML = window.cartStrings.quantityError.replace(
          '[quantity]',
          document.getElementById(`Quantity-${line}`).value
        );
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    console.log("Get section innerHTML: ", html, selector);
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    console.log("enableLoading: ", line);
    document.getElementById('main-cart-items').classList.add('cart__items--disabled');
    this.querySelectorAll('.loading-overlay')[line - 1].classList.remove('hidden');
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    console.log("disableLoading fired.")
    document.getElementById('main-cart-items').classList.remove('cart__items--disabled');
  }
}
customElements.define('cart-items', CartItems);

//  CUSTOM FUNCTIONS FOR SCH  //

let modal = document.getElementById("checkout-modal");
let sch_close = document.getElementById("sch-modal-icon").children[0];
let mechanic_btn = document.getElementById("mechanic_cart_submit");
let cart_btns = document.getElementsByName("checkout");
let btn = document.getElementById("close-modal-btn");
let cost_center_num = document.getElementById("cost-center-number");


// EMPTY THE CART AFTER DRAFT ORDER IS SUCCESSFULLY SUBMITTED //
function emptyCart() {
  fetch('cart/clear.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(response => {
    console.log("Cart cleared successfully!");
  }).catch( (error) => {
    console.log("There was an error clearing the cart!", error);
  });
}
// RADIO BUTTONS FOR SELECTING CHECKOUT PATH //
let radio_btn_value = "";
function activateCheckout(e) {
  radio_btn_value = e;
  if (e === "cost-center") {
    cart_btns[0].disabled = true;
    cart_btns[0].type="hidden"
    cost_center_num.disabled = false;
    mechanic_btn.type = "submit";
    mechanic_btn.disabled = true;
    
  } else if (e === "personal") {
    cost_center_num.disabled = true;
    cart_btns[0].disabled = false;
    cart_btns[0].type = "submit";
    mechanic_btn.type = "hidden";
    cost_center_num.disabled = true;
    cost_center_num.value = "";
  }
}

// Cost Center Input Field // 
cost_center_num.addEventListener('input', function(e) {
  if(cost_center_num.value.length > 0) {
    console.log("csn: ", cost_center_num.value.length);
    console.log(radio_btn_value);
    cart_btns[0].type = "hidden";
    mechanic_btn.disabled = false;
    mechanic_btn.type = "submit";
  } 
  if (cost_center_num.value.length === 0) {
    console.log(cost_center_num.value.length);
    cart_btns[0].disabled = true;
    mechanic_btn.disabled = true;
    mechanic_btn.type = "submit";
    cost_center_num.value = "";
  }
});

sch_close.onclick = function() {
  modal.style.display = "none";
  location.reload();
}

window.onclick = function() {
  modal.style.display = "none";
}

// function errorModal() {
//   let content = document.getElementById("sch-content");
//   let modal_btn = document.querySelector(".btn-container");
//   let error_msg = document.createTextNode("ERROR MSG");
//   let modal_msg = document.querySelector(".sch-message").childNodes[1];
  
//   content.classList.remove("form-message--success");
//   content.classList.add("form-message--error");
//   modal_btn.style.display = "none";
//   modal_msg.replaceChild(error_msg, modal_msg.childNodes[0]);
//   modal.style.display = "block";
// }//  CUSTOM FUNCTIONS FOR SCH  //

let modal = document.getElementById("checkout-modal");
let sch_close = document.getElementById("sch-modal-icon").children[0];
let mechanic_btn = document.getElementById("mechanic_cart_submit");
let cart_btns = document.getElementsByName("checkout");
let btn = document.getElementById("close-modal-btn");
let cost_center_num = document.getElementById("cost-center-number");


// EMPTY THE CART AFTER DRAFT ORDER IS SUCCESSFULLY SUBMITTED //
function emptyCart() {
  fetch('cart/clear.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(response => {
    console.log("Cart cleared successfully!");
  }).catch( (error) => {
    console.log("There was an error clearing the cart!", error);
  });
}
// RADIO BUTTONS FOR SELECTING CHECKOUT PATH //
let radio_btn_value = "";
function activateCheckout(e) {
  radio_btn_value = e;
  if (e === "cost-center") {
    cart_btns[0].disabled = true;
    cart_btns[0].type="hidden"
    cost_center_num.disabled = false;
    mechanic_btn.type = "submit";
    mechanic_btn.disabled = true;
    
  } else if (e === "personal") {
    cost_center_num.disabled = true;
    cart_btns[0].disabled = false;
    cart_btns[0].type = "submit";
    mechanic_btn.type = "hidden";
    cost_center_num.disabled = true;
    cost_center_num.value = "";
  }
}

// Cost Center Input Field // 
cost_center_num.addEventListener('input', function(e) {
  if(cost_center_num.value.length > 0) {
    console.log("csn: ", cost_center_num.value.length);
    console.log(radio_btn_value);
    cart_btns[0].type = "hidden";
    mechanic_btn.disabled = false;
    mechanic_btn.type = "submit";
  } 
  if (cost_center_num.value.length === 0) {
    console.log(cost_center_num.value.length);
    cart_btns[0].disabled = true;
    mechanic_btn.disabled = true;
    mechanic_btn.type = "submit";
    cost_center_num.value = "";
  }
});

sch_close.onclick = function() {
  modal.style.display = "none";
  location.reload();
}

window.onclick = function() {
  modal.style.display = "none";
}

// function errorModal() {
//   let content = document.getElementById("sch-content");
//   let modal_btn = document.querySelector(".btn-container");
//   let error_msg = document.createTextNode("ERROR MSG");
//   let modal_msg = document.querySelector(".sch-message").childNodes[1];
  
//   content.classList.remove("form-message--success");
//   content.classList.add("form-message--error");
//   modal_btn.style.display = "none";
//   modal_msg.replaceChild(error_msg, modal_msg.childNodes[0]);
//   modal.style.display = "block";
// }
