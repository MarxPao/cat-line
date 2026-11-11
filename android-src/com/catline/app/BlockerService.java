package com.catline.app;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Serviço de acessibilidade que detecta o app em primeiro plano e exibe
 * instantaneamente uma barreira nativa (TYPE_ACCESSIBILITY_OVERLAY) sobre
 * qualquer rede social ou aplicativo trancado pela usuária.
 */
public class BlockerService extends AccessibilityService {
    private static final long DEBOUNCE_MS = 900L;
    private String lastPkg = "";
    private long lastAt = 0L;
    private WindowManager wm;
    private View overlayView;
    private String overlayPkg = "";
    private CountDownTimer activeTimer;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        AccessibilityServiceInfo info = getServiceInfo();
        if (info != null) {
            info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
                    | AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
                    | AccessibilityEvent.TYPE_WINDOWS_CHANGED;
            info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
            info.notificationTimeout = 80;
            info.flags |= AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS;
            setServiceInfo(info);
        }
        BlockerStore.markConnected(this);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        String pkg = null;
        if (event != null && event.getPackageName() != null) {
            pkg = event.getPackageName().toString();
        }
        if (pkg == null || isIgnoredSystemPackage(pkg)) {
            AccessibilityNodeInfo root = null;
            try {
                root = getRootInActiveWindow();
                if (root != null && root.getPackageName() != null) {
                    pkg = root.getPackageName().toString();
                }
            } catch (Exception ignored) {
            } finally {
                if (root != null) {
                    try { root.recycle(); } catch (Exception ignored) {}
                }
            }
        }
        if (pkg == null || pkg.isEmpty() || pkg.equals(getPackageName()) || isIgnoredSystemPackage(pkg)) {
            return;
        }

        BlockerStore.markSeen(this, pkg);

        BlockPolicy.Decision d = BlockPolicy.evaluate(this, pkg);
        if (d == null) {
            if (!overlayPkg.isEmpty() && !pkg.equals(overlayPkg)) {
                dismissOverlay();
            }
            return;
        }

        long now = SystemClock.elapsedRealtime();
        if (pkg.equals(lastPkg) && now - lastAt < DEBOUNCE_MS) {
            return;
        }
        lastPkg = pkg;
        lastAt = now;

        BlockerStore.markBlocked(this, pkg);
        showNativeOverlay(d);
    }

    private boolean isIgnoredSystemPackage(String pkg) {
        return pkg.equals("com.android.systemui")
                || pkg.contains("inputmethod")
                || pkg.contains("keyboard")
                || pkg.contains("permissioncontroller")
                || pkg.contains("packageinstaller");
    }

    private void showNativeOverlay(final BlockPolicy.Decision d) {
        // 1. Ação global mandatória: minimiza o app trancado de volta para a Home imediatamente!
        try {
            performGlobalAction(GLOBAL_ACTION_HOME);
        } catch (Exception ignored) {}

        // 2. Abre a tela nativa de bloqueio BlockActivity com a gatinha
        try {
            Intent actIntent = BlockActivity.intentFor(this, d);
            startActivity(actIntent);
        } catch (Exception ignored) {}

        if (wm == null) wm = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (wm == null) {
            return;
        }

        dismissOverlay();

        try {
            LinearLayout root = new LinearLayout(this);
            root.setOrientation(LinearLayout.VERTICAL);
            root.setGravity(Gravity.CENTER);
            root.setBackgroundColor(Color.parseColor("#181425"));
            int pad = dp(24);
            root.setPadding(pad, pad, pad, pad);

            TextView cat = makeText("🐱🔒", 56, "#FFF3B0", false);
            TextView title = makeText(getString(R.string.block_title, d.name), 22, "#FFF3B0", true);
            String body;
            switch (d.rigor) {
                case 2: body = getString(R.string.block_msg_friction, d.frictionSeconds); break;
                case 3: body = getString(R.string.block_msg_conditional, Math.max(1, d.pending)); break;
                case 4: body = getString(R.string.block_msg_firm, d.windowEnd); break;
                default: body = getString(R.string.block_msg_warning, d.windowStart, d.windowEnd); break;
            }
            TextView msg = makeText(body, 16, "#FFFFFF", false);
            msg.setPadding(0, dp(12), 0, dp(22));

            root.addView(cat);
            root.addView(title);
            root.addView(msg);

            // Botão para abrir o Cat Line (cumprir tarefas ou usar Peixinhos para resgatar passe de recompensa)
            Button openApp = makeButton(getString(R.string.block_btn_tasks), "#5CAB5E");
            openApp.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    dismissOverlay();
                    Intent i = new Intent(BlockerService.this, MainActivity.class);
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    startActivity(i);
                }
            });
            root.addView(openApp);

            // Botão para usar minutos do Banco de Minutos (Fase 5)
            long bankSec = BlockerStore.getMinuteBankBalanceSeconds(this);
            if (bankSec >= 60) {
                final int availMin = (int) (bankSec / 60);
                Button bankBtn = makeButton("Liberar com Banco de Minutos · " + availMin + " min", "#8E44AD");
                bankBtn.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        int toUse = Math.min(15, availMin);
                        BlockerStore.consumeMinuteBank(BlockerService.this, d.pkg, toUse);
                        if (d.rulePkg != null) BlockerStore.consumeMinuteBank(BlockerService.this, d.rulePkg, toUse);
                        dismissOverlay();
                    }
                });
                root.addView(bankBtn);
            }

            if (d.rigor == 1 || d.rigor == 2) {
                final Button cont = makeButton(getString(R.string.block_btn_continue, d.passMinutes), "#5A4E7C");
                root.addView(cont);
                cont.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        BlockerStore.grantPass(BlockerService.this, d.pkg, d.passMinutes);
                        if (d.rulePkg != null) BlockerStore.grantPass(BlockerService.this, d.rulePkg, d.passMinutes);
                        dismissOverlay();
                    }
                });
                if (d.rigor == 2) {
                    cont.setEnabled(false);
                    cont.setText(getString(R.string.block_btn_wait, d.frictionSeconds));
                    activeTimer = new CountDownTimer(d.frictionSeconds * 1000L, 1000L) {
                        @Override
                        public void onTick(long ms) {
                            cont.setText(getString(R.string.block_btn_wait, (int) Math.ceil(ms / 1000.0)));
                        }

                        @Override
                        public void onFinish() {
                            cont.setText(getString(R.string.block_btn_continue, d.passMinutes));
                            cont.setEnabled(true);
                        }
                    }.start();
                }
            }

            // Saída de Emergência de 10 segundos inegociável (Fase 5)
            final Button emergBtn = makeButton("🚨 Saída de Emergência", "#C0392B");
            emergBtn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    emergBtn.setEnabled(false);
                    activeTimer = new CountDownTimer(10000L, 1000L) {
                        @Override
                        public void onTick(long ms) {
                            emergBtn.setText("Aguarde " + (int) Math.ceil(ms / 1000.0) + "s para emergência");
                        }

                        @Override
                        public void onFinish() {
                            emergBtn.setText("Liberado em Emergência!");
                            BlockerStore.grantPass(BlockerService.this, d.pkg, 10);
                            if (d.rulePkg != null) BlockerStore.grantPass(BlockerService.this, d.rulePkg, 10);
                            dismissOverlay();
                        }
                    }.start();
                }
            });
            root.addView(emergBtn);

            Button back = makeButton(getString(R.string.block_btn_back), "#E06C75");
            back.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    dismissOverlay();
                    performGlobalAction(GLOBAL_ACTION_HOME);
                }
            });
            root.addView(back);

            int type = Build.VERSION.SDK_INT >= 22
                    ? WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE;
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    type,
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                            | WindowManager.LayoutParams.FLAG_FULLSCREEN
                            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                    PixelFormat.TRANSLUCENT);
            lp.gravity = Gravity.CENTER;

            wm.addView(root, lp);
            overlayView = root;
            overlayPkg = d.pkg;
        } catch (Exception e) {
            // Caso o dispositivo não suporte overlay direto, abre a Activity
            try {
                startActivity(BlockActivity.intentFor(this, d));
            } catch (Exception ignored) {}
        }
    }

    private void dismissOverlay() {
        if (activeTimer != null) {
            activeTimer.cancel();
            activeTimer = null;
        }
        if (overlayView != null && wm != null) {
            try {
                wm.removeView(overlayView);
            } catch (Exception ignored) {}
        }
        overlayView = null;
        overlayPkg = "";
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density);
    }

    private TextView makeText(String s, int sp, String color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(Color.parseColor(color));
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private Button makeButton(String s, String bg) {
        Button b = new Button(this);
        b.setText(s);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(Color.parseColor(bg));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52));
        lp.topMargin = dp(10);
        b.setLayoutParams(lp);
        return b;
    }

    @Override
    public void onInterrupt() {
        dismissOverlay();
    }

    @Override
    public void onDestroy() {
        dismissOverlay();
        super.onDestroy();
    }
}
