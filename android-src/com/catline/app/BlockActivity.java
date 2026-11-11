package com.catline.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Tela cheia exibida pela gatinha por cima do app de rede social travado. */
public class BlockActivity extends Activity {
    private CountDownTimer timer;

    static Intent intentFor(android.content.Context c, BlockPolicy.Decision d) {
        Intent i = new Intent(c, BlockActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_NO_ANIMATION);
        i.putExtra("pkg", d.pkg);
        i.putExtra("name", d.name);
        i.putExtra("start", d.windowStart);
        i.putExtra("end", d.windowEnd);
        i.putExtra("rigor", d.rigor);
        i.putExtra("pending", d.pending);
        i.putExtra("friction", d.frictionSeconds);
        i.putExtra("passMin", d.passMinutes);
        return i;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent in = getIntent();
        final String pkg = in.getStringExtra("pkg");
        String name = in.getStringExtra("name");
        String start = in.getStringExtra("start");
        String end = in.getStringExtra("end");
        int rigor = in.getIntExtra("rigor", 1);
        int pending = in.getIntExtra("pending", 0);
        final int friction = in.getIntExtra("friction", 15);
        final int passMin = in.getIntExtra("passMin", 15);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#181425"));
        int pad = dp(24);
        root.setPadding(pad, pad, pad, pad);

        TextView cat = text("🐱", 64, "#FFF3B0", false);
        TextView title = text(getString(R.string.block_title, name), 22, "#FFF3B0", true);
        String body;
        switch (rigor) {
            case 2: body = getString(R.string.block_msg_friction, friction); break;
            case 3: body = getString(R.string.block_msg_conditional, pending); break;
            case 4: body = getString(R.string.block_msg_firm, end); break;
            default: body = getString(R.string.block_msg_warning, start, end); break;
        }
        TextView msg = text(body, 16, "#FFFFFF", false);
        msg.setPadding(0, dp(12), 0, dp(24));

        root.addView(cat);
        root.addView(title);
        root.addView(msg);

        final Button cont = button(getString(R.string.block_btn_continue, passMin), "#5A4E7C");
        if (rigor == 1 || rigor == 2) {
            root.addView(cont);
            cont.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    BlockerStore.grantPass(BlockActivity.this, pkg, passMin);
                    finish();
                }
            });
            if (rigor == 2) {
                cont.setEnabled(false);
                cont.setText(getString(R.string.block_btn_wait, friction));
                timer = new CountDownTimer(friction * 1000L, 1000L) {
                    @Override
                    public void onTick(long ms) {
                        cont.setText(getString(R.string.block_btn_wait, (int) Math.ceil(ms / 1000.0)));
                    }

                    @Override
                    public void onFinish() {
                        cont.setText(getString(R.string.block_btn_continue, passMin));
                        cont.setEnabled(true);
                    }
                }.start();
            }
        }

        // Botão para usar minutos do Banco de Minutos (Fase 5)
        long bankSec = BlockerStore.getMinuteBankBalanceSeconds(this);
        if (bankSec >= 60) {
            final int availMin = (int) (bankSec / 60);
            Button bankBtn = button("Liberar com Banco de Minutos · " + availMin + " min", "#8E44AD");
            bankBtn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    int toUse = Math.min(15, availMin);
                    BlockerStore.consumeMinuteBank(BlockActivity.this, pkg, toUse);
                    finish();
                }
            });
            root.addView(bankBtn);
        }

        if (rigor == 3) {
            Button open = button(getString(R.string.block_btn_tasks), "#5CAB5E");
            root.addView(open);
            open.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent i = new Intent(BlockActivity.this, MainActivity.class);
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    startActivity(i);
                    finish();
                }
            });
        }

        // Saída de Emergência de 10 segundos inegociável (Fase 5)
        final Button emergBtn = button("🚨 Saída de Emergência", "#C0392B");
        emergBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                emergBtn.setEnabled(false);
                timer = new CountDownTimer(10000L, 1000L) {
                    @Override
                    public void onTick(long ms) {
                        emergBtn.setText("Aguarde " + (int) Math.ceil(ms / 1000.0) + "s para emergência");
                    }

                    @Override
                    public void onFinish() {
                        emergBtn.setText("Liberado em Emergência!");
                        BlockerStore.grantPass(BlockActivity.this, pkg, 10);
                        finish();
                    }
                }.start();
            }
        });
        root.addView(emergBtn);

        Button back = button(getString(R.string.block_btn_back), "#E06C75");
        root.addView(back);
        back.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                goHome();
            }
        });

        setContentView(root);
    }

    @Override
    public void onBackPressed() {
        goHome();
    }

    @Override
    protected void onDestroy() {
        if (timer != null) timer.cancel();
        super.onDestroy();
    }

    private void goHome() {
        Intent home = new Intent(Intent.ACTION_MAIN);
        home.addCategory(Intent.CATEGORY_HOME);
        home.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(home);
        finish();
    }

    private int dp(int v) {
        return (int) (v * getResources().getDisplayMetrics().density);
    }

    private TextView text(String s, int sp, String color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(Color.parseColor(color));
        t.setGravity(Gravity.CENTER);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private Button button(String s, String bg) {
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
}
