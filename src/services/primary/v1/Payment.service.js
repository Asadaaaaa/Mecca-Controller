import { PaymentRepository, InvoiceRepository, CustomerRepository } from "#repositoriesPrimaryV1";

class PaymentService {
    constructor(server) {
        this.server = server;
        this.paymentRepo = new PaymentRepository(this.server);
        this.invoiceRepo = new InvoiceRepository(this.server);
        this.customerRepo = new CustomerRepository(this.server);
    }

    async generatePaymentNumber(date = new Date()) {
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const prefix = `PAY-${yyyy}${mm}-`;

        const latest = await this.paymentRepo.paymentTable.findOne({
            where: {
                payment_number: {
                    [this.server.model.db.Sequelize.Op.like]: `${prefix}%`
                }
            },
            order: [['id', 'DESC']]
        });

        if (!latest) {
            return `${prefix}001`;
        }

        const parts = latest.payment_number.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
        const nextSeq = String(lastSeq + 1).padStart(3, '0');
        return `${prefix}${nextSeq}`;
    }

    async getPayments(query = {}) {
        const page = parseInt(query.page || 1, 10);
        const limit = parseInt(query.limit || 10, 10);

        const result = await this.paymentRepo.findPayments(query);
        const total = result.count;
        const totalPages = Math.ceil(total / limit) || 1;

        const items = result.rows.map(p => {
            const amount = parseFloat(p.amount) || 0;
            const refInvoices = p.allocations?.map(a => a.invoice?.invoice_number).filter(Boolean).join(', ') || '-';

            return {
                id: p.id,
                paymentNo: p.payment_number,
                payment_number: p.payment_number,
                refInvoice: refInvoices,
                date: p.payment_date,
                payment_date: p.payment_date,
                customer_id: p.customer_id,
                customerName: p.customer?.name || '-',
                customerPhone: p.customer?.phone || '-',
                amount: amount,
                paymentMethod: p.payment_method,
                payment_method: p.payment_method,
                bankAccount: p.bank_account || '-',
                bank_account: p.bank_account || '-',
                referenceNumber: p.reference_number || '-',
                reference_number: p.reference_number || '-',
                status: p.status,
                notes: p.notes || '',
                creator: p.creator?.name || '-',
                allocations: p.allocations ? p.allocations.map(a => ({
                    id: a.id,
                    payment_id: a.payment_id,
                    invoice_id: a.invoice_id,
                    invoiceNo: a.invoice?.invoice_number || '-',
                    invoiceDate: a.invoice?.invoice_date || '-',
                    dueDate: a.invoice?.due_date || '-',
                    grandTotal: parseFloat(a.invoice?.grand_total) || 0,
                    paidAmount: parseFloat(a.invoice?.paid_amount) || 0,
                    allocatedAmount: parseFloat(a.allocated_amount) || 0,
                    status: a.invoice?.status || '-'
                })) : [],
                created_at: p.created_at,
                updated_at: p.updated_at
            };
        });

        return {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        };
    }

    async getPaymentById(id) {
        const p = await this.paymentRepo.findPaymentById(id);
        if (!p) return null;

        const amount = parseFloat(p.amount) || 0;
        const refInvoices = p.allocations?.map(a => a.invoice?.invoice_number).filter(Boolean).join(', ') || '-';

        return {
            id: p.id,
            paymentNo: p.payment_number,
            payment_number: p.payment_number,
            refInvoice: refInvoices,
            date: p.payment_date,
            payment_date: p.payment_date,
            customer_id: p.customer_id,
            customerName: p.customer?.name || '-',
            customerPhone: p.customer?.phone || '-',
            customerAddress: p.customer?.address || '-',
            amount: amount,
            paymentMethod: p.payment_method,
            payment_method: p.payment_method,
            bankAccount: p.bank_account || '-',
            bank_account: p.bank_account || '-',
            referenceNumber: p.reference_number || '-',
            reference_number: p.reference_number || '-',
            status: p.status,
            notes: p.notes || '',
            creator: p.creator?.name || '-',
            allocations: p.allocations ? p.allocations.map(a => ({
                id: a.id,
                payment_id: a.payment_id,
                invoice_id: a.invoice_id,
                invoiceNo: a.invoice?.invoice_number || '-',
                invoiceDate: a.invoice?.invoice_date || '-',
                dueDate: a.invoice?.due_date || '-',
                grandTotal: parseFloat(a.invoice?.grand_total) || 0,
                paidAmount: parseFloat(a.invoice?.paid_amount) || 0,
                allocatedAmount: parseFloat(a.allocated_amount) || 0,
                status: a.invoice?.status || '-'
            })) : [],
            created_at: p.created_at,
            updated_at: p.updated_at
        };
    }

    async getPaymentMetrics() {
        return await this.paymentRepo.getPaymentMetrics();
    }

    async createPayment(data, userId = null) {
        const paymentId = await this.server.model.db.transaction(async (t) => {
            const customerId = data.customer_id;
            if (!customerId) {
                throw new Error("Customer wajib dipilih.");
            }

            const paymentDate = data.payment_date || new Date().toISOString().slice(0, 10);
            const paymentNumber = data.payment_number || await this.generatePaymentNumber(paymentDate);
            const amount = parseFloat(data.amount) || 0;
            if (amount <= 0) {
                throw new Error("Nominal pembayaran harus lebih besar dari 0.");
            }

            const allocations = Array.isArray(data.allocations) ? data.allocations : [];
            let totalAllocated = 0;

            for (const alloc of allocations) {
                const allocAmt = parseFloat(alloc.allocated_amount) || 0;
                if (allocAmt <= 0) continue;
                totalAllocated += allocAmt;
            }

            if (totalAllocated > amount) {
                throw new Error(`Total alokasi pembayaran (IDR ${totalAllocated.toLocaleString('id-ID')}) melebihi nominal pembayaran (IDR ${amount.toLocaleString('id-ID')}).`);
            }

            const status = data.status || 'Terverifikasi';

            const payment = await this.paymentRepo.createPayment({
                payment_number: paymentNumber,
                customer_id: customerId,
                payment_date: paymentDate,
                amount: amount,
                payment_method: data.payment_method || 'Transfer Bank',
                bank_account: data.bank_account || null,
                reference_number: data.reference_number || null,
                status: status,
                notes: data.notes || null,
                created_by: userId
            }, t);

            const allocationRecords = [];
            const todayStr = new Date().toISOString().slice(0, 10);

            for (const alloc of allocations) {
                const allocAmt = parseFloat(alloc.allocated_amount) || 0;
                if (allocAmt <= 0) continue;

                const invoice = await this.server.model.invoices.table.findByPk(alloc.invoice_id, { transaction: t });
                if (!invoice) {
                    throw new Error(`Invoice ID ${alloc.invoice_id} tidak ditemukan.`);
                }

                allocationRecords.push({
                    payment_id: payment.id,
                    invoice_id: invoice.id,
                    allocated_amount: allocAmt
                });

                // If payment is Terverifikasi, update invoice paid_amount and status
                if (status === 'Terverifikasi') {
                    const currentPaid = parseFloat(invoice.paid_amount) || 0;
                    const grandTotal = parseFloat(invoice.grand_total) || 0;
                    const newPaid = currentPaid + allocAmt;

                    let invStatus = 'Sebagian';
                    if (newPaid >= grandTotal) {
                        invStatus = 'Lunas';
                    } else if (newPaid <= 0) {
                        invStatus = (invoice.due_date && invoice.due_date < todayStr) ? 'Jatuh Tempo' : 'Belum Dibayar';
                    }

                    await invoice.update({
                        paid_amount: newPaid,
                        status: invStatus
                    }, { transaction: t });
                }
            }

            if (allocationRecords.length > 0) {
                await this.paymentRepo.createPaymentAllocations(allocationRecords, t);
            }

            return payment.id;
        });

        return await this.getPaymentById(paymentId);
    }

    async updatePayment(id, data) {
        await this.server.model.db.transaction(async (t) => {
            const payment = await this.server.model.payments.table.findByPk(id, {
                include: [
                    {
                        model: this.server.model.paymentAllocations.table,
                        as: 'allocations'
                    }
                ],
                transaction: t
            });

            if (!payment) {
                throw new Error("Data pembayaran tidak ditemukan.");
            }

            const oldStatus = payment.status;
            const newStatus = data.status || oldStatus;

            // If status changed between Terverifikasi and (Pending Kliring / Dibatalkan)
            if (oldStatus !== newStatus) {
                const todayStr = new Date().toISOString().slice(0, 10);

                if (oldStatus === 'Terverifikasi' && newStatus !== 'Terverifikasi') {
                    // Revert allocations from invoices
                    for (const alloc of payment.allocations) {
                        const invoice = await this.server.model.invoices.table.findByPk(alloc.invoice_id, { transaction: t });
                        if (invoice) {
                            const grandTotal = parseFloat(invoice.grand_total) || 0;
                            const newPaid = Math.max(0, (parseFloat(invoice.paid_amount) || 0) - parseFloat(alloc.allocated_amount));
                            let invStatus = 'Sebagian';
                            if (newPaid >= grandTotal) {
                                invStatus = 'Lunas';
                            } else if (newPaid <= 0) {
                                invStatus = (invoice.due_date && invoice.due_date < todayStr) ? 'Jatuh Tempo' : 'Belum Dibayar';
                            }
                            await invoice.update({ paid_amount: newPaid, status: invStatus }, { transaction: t });
                        }
                    }
                } else if (oldStatus !== 'Terverifikasi' && newStatus === 'Terverifikasi') {
                    // Apply allocations to invoices
                    for (const alloc of payment.allocations) {
                        const invoice = await this.server.model.invoices.table.findByPk(alloc.invoice_id, { transaction: t });
                        if (invoice) {
                            const grandTotal = parseFloat(invoice.grand_total) || 0;
                            const newPaid = (parseFloat(invoice.paid_amount) || 0) + parseFloat(alloc.allocated_amount);
                            let invStatus = 'Sebagian';
                            if (newPaid >= grandTotal) {
                                invStatus = 'Lunas';
                            } else if (newPaid <= 0) {
                                invStatus = (invoice.due_date && invoice.due_date < todayStr) ? 'Jatuh Tempo' : 'Belum Dibayar';
                            }
                            await invoice.update({ paid_amount: newPaid, status: invStatus }, { transaction: t });
                        }
                    }
                }
            }

            await payment.update({
                payment_date: data.payment_date || payment.payment_date,
                payment_method: data.payment_method || payment.payment_method,
                bank_account: data.bank_account !== undefined ? data.bank_account : payment.bank_account,
                reference_number: data.reference_number !== undefined ? data.reference_number : payment.reference_number,
                status: newStatus,
                notes: data.notes !== undefined ? data.notes : payment.notes
            }, { transaction: t });
        });

        return await this.getPaymentById(id);
    }

    async deletePayment(id) {
        return await this.server.model.db.transaction(async (t) => {
            const payment = await this.server.model.payments.table.findByPk(id, {
                include: [
                    {
                        model: this.server.model.paymentAllocations.table,
                        as: 'allocations'
                    }
                ],
                transaction: t
            });

            if (!payment) return false;

            const todayStr = new Date().toISOString().slice(0, 10);

            // Revert allocations if payment was Terverifikasi
            if (payment.status === 'Terverifikasi' && payment.allocations) {
                for (const alloc of payment.allocations) {
                    const invoice = await this.server.model.invoices.table.findByPk(alloc.invoice_id, { transaction: t });
                    if (invoice) {
                        const grandTotal = parseFloat(invoice.grand_total) || 0;
                        const newPaid = Math.max(0, (parseFloat(invoice.paid_amount) || 0) - parseFloat(alloc.allocated_amount));
                        let invStatus = 'Sebagian';
                        if (newPaid >= grandTotal) {
                            invStatus = 'Lunas';
                        } else if (newPaid <= 0) {
                            invStatus = (invoice.due_date && invoice.due_date < todayStr) ? 'Jatuh Tempo' : 'Belum Dibayar';
                        }
                        await invoice.update({ paid_amount: newPaid, status: invStatus }, { transaction: t });
                    }
                }
            }

            await this.server.model.paymentAllocations.table.destroy({
                where: { payment_id: id },
                transaction: t
            });

            await payment.destroy({ transaction: t });
            return true;
        });
    }

    async batchDeletePayments(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return 0;
        let deletedCount = 0;
        for (const id of ids) {
            const success = await this.deletePayment(id);
            if (success) deletedCount++;
        }
        return deletedCount;
    }
}

export default PaymentService;
