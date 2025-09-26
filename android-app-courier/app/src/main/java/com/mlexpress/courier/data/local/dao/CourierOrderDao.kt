package com.mlexpress.courier.data.local.dao

import androidx.room.*
import com.mlexpress.courier.data.model.CourierOrder
import com.mlexpress.courier.data.model.OrderStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface CourierOrderDao {
    
    @Query("SELECT * FROM courier_orders WHERE courierId = :courierId ORDER BY createdAt DESC")
    fun getOrdersByCourier(courierId: String): Flow<List<CourierOrder>>
    
    @Query("SELECT * FROM courier_orders WHERE courierId = :courierId AND status IN (:statuses) ORDER BY createdAt DESC")
    suspend fun getActiveOrders(courierId: String, statuses: List<OrderStatus> = listOf(
        OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.ARRIVED
    )): List<CourierOrder>
    
    @Query("SELECT * FROM courier_orders WHERE id = :orderId")
    suspend fun getOrderById(orderId: String): CourierOrder?
    
    @Query("SELECT * FROM courier_orders WHERE orderNumber = :orderNumber")
    suspend fun getOrderByNumber(orderNumber: String): CourierOrder?
    
    @Query("SELECT * FROM courier_orders WHERE id = :orderId")
    fun getOrderByIdFlow(orderId: String): Flow<CourierOrder?>
    
    @Query("SELECT COUNT(*) FROM courier_orders WHERE courierId = :courierId AND status = :status AND DATE(createdAt/1000, 'unixepoch') = DATE('now')")
    suspend fun getTodayCompletedCount(courierId: String, status: OrderStatus = OrderStatus.DELIVERED): Int
    
    @Query("SELECT COUNT(*) FROM courier_orders WHERE courierId = :courierId AND status = :status")
    suspend fun getOrderCountByStatus(courierId: String, status: OrderStatus): Int
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: CourierOrder)
    
    @Update
    suspend fun updateOrder(order: CourierOrder)
    
    @Delete
    suspend fun deleteOrder(order: CourierOrder)
    
    @Query("UPDATE courier_orders SET status = :status WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: String, status: OrderStatus)
    
    @Query("DELETE FROM courier_orders WHERE courierId = :courierId")
    suspend fun deleteOrdersByCourier(courierId: String)
    
    @Query("DELETE FROM courier_orders")
    suspend fun clearAllOrders()
}
